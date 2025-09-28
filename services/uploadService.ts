import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { API_CONFIG, APP_CONFIG, ERROR_MESSAGES } from "../constants/config";
import type {
  ApiErrorType,
  BackendErrorType,
  DeviceInfo,
  FileValidation,
  ServiceError,
  UploadOptions,
  UploadProgress,
  UploadRequest,
  UploadResponse,
} from "../types/api";
import { ApiError, ApiService } from "./api";

type BackendResponse = {
  status: string;
  status_code: number;
  message?: string;
  data?: any;
};

export class UploadService {
  private apiService: ApiService;

  constructor() {
    this.apiService = new ApiService(API_CONFIG.BASE_URL);
  }

  /**
   * Set authentication token for uploads
   */
  setAuthToken(token: string): void {
    this.apiService.setAuthToken(token);
  }

  /**
   * Remove authentication token
   */
  removeAuthToken(): void {
    this.apiService.removeAuthToken();
  }

  /**
   * Validate image file before upload
   */
  private async validateImageFile(imageUri: string): Promise<FileValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri);

      if (!fileInfo.exists) {
        errors.push("File does not exist");
        return { isValid: false, errors, warnings };
      }

      // Check file size
      if (fileInfo.size && fileInfo.size > API_CONFIG.UPLOAD.MAX_FILE_SIZE) {
        errors.push(ERROR_MESSAGES.UPLOAD.FILE_TOO_LARGE);
      }

      // For React Native, we might not have direct MIME type access
      // We'll infer from file extension or trust the file picker
      const fileName = imageUri.split("/").pop() || "";
      const fileExtension = fileName.split(".").pop()?.toLowerCase();

      const validExtensions = ["jpg", "jpeg", "png", "webp"];
      if (fileExtension && !validExtensions.includes(fileExtension)) {
        errors.push(ERROR_MESSAGES.UPLOAD.INVALID_FORMAT);
      }

      // Add warnings for large files (but not errors)
      if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) {
        // 5MB
        warnings.push("Large file size may take longer to upload");
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileInfo: fileInfo.exists
          ? {
              name: fileName,
              size: fileInfo.size || 0,
              type: this.getMimeTypeFromExtension(fileExtension || ""),
              lastModified: fileInfo.modificationTime || Date.now(),
            }
          : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ["Failed to validate file"],
        warnings,
      };
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    return mimeTypes[extension.toLowerCase()] || "image/jpeg";
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    return {
      platform: Platform.OS as "ios" | "android" | "web",
      osVersion: Platform.Version?.toString(),
      appVersion: APP_CONFIG.VERSION,
      deviceModel:
        Platform.OS === "ios"
          ? (Platform.constants as any)?.deviceName
          : (Platform.constants as any)?.model || "Unknown",
      screenDimensions: {
        width: 0, // We'll get this from Dimensions API if needed
        height: 0,
      },
    };
  }

  /**
   * Convert image to base64
   */
  private async convertImageToBase64(imageUri: string): Promise<{
    base64: string;
    mimeType: string;
    fileName: string;
    size: number;
  }> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        throw new Error("Image file does not exist");
      }

      // Get file name and extension
      const fileName = imageUri.split("/").pop() || `image_${Date.now()}.jpg`;
      const fileExtension = fileName.split(".").pop()?.toLowerCase() || "jpg";
      const mimeType = this.getMimeTypeFromExtension(fileExtension);

      // Convert to base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return {
        base64,
        mimeType,
        fileName,
        size: fileInfo.size || 0,
      };
    } catch (error) {
      throw new Error(
        `Failed to convert image to base64: ${(error as Error).message}`
      );
    }
  }

  /**
   * Create JSON payload for image upload (with base64)
   */
  private async createUploadPayload(
    imageUri: string,
    uploadRequest: UploadRequest
  ): Promise<any> {
    // Convert image to base64
    const imageData = await this.convertImageToBase64(imageUri);

    // Create upload payload matching backend's expected format
    const payload = {
      encoded_image: imageData.base64,
      media_type: imageData.mimeType,
      // Additional metadata (optional)
      metadata: {
        fileName: imageData.fileName,
        size: imageData.size,
        tags: uploadRequest.tags || [],
        deviceInfo: this.getDeviceInfo(),
        uploadedAt: new Date().toISOString(),
        ...uploadRequest.metadata,
      },
    };

    return payload;
  }

  /**
   * Convert API error to service error with enhanced backend error mapping
   */
  private convertToServiceError(error: unknown): ServiceError {
    if (error instanceof ApiError) {
      let type: ApiErrorType = "UNKNOWN_ERROR";
      let backendErrorType: BackendErrorType | undefined;
      let retryable = false;

      // Map HTTP status codes to error types
      if (error.status === 0) {
        type = "NETWORK_ERROR";
        retryable = true;
      } else if (error.status === 408) {
        type = "TIMEOUT_ERROR";
        backendErrorType = "RequestTimeout";
        retryable = true;
      } else if (error.status === 400) {
        // Check specific backend error types in response
        const errorMessage = error.message.toLowerCase();
        const responseData = error.response;
        
        if (errorMessage.includes('base64') || errorMessage.includes('encoded_image')) {
          type = "IMAGE_PROCESSING_ERROR";
          backendErrorType = "Base64ValidationError";
        } else if (errorMessage.includes('image size') || errorMessage.includes('file size')) {
          type = "IMAGE_PROCESSING_ERROR";
          backendErrorType = "ImageSizeError";
        } else if (errorMessage.includes('image type') || errorMessage.includes('unsupported')) {
          type = "IMAGE_PROCESSING_ERROR";
          backendErrorType = "UnsupportedImageTypeError";
        } else if (errorMessage.includes('image processing')) {
          type = "IMAGE_PROCESSING_ERROR";
          backendErrorType = "ImageProcessingError";
        } else {
          type = "VALIDATION_ERROR";
          backendErrorType = "ValidationError";
        }
      } else if (error.status === 401) {
        type = "AUTHENTICATION_ERROR";
      } else if (error.status === 403) {
        type = "AUTHORIZATION_ERROR";
      } else if (error.status === 404) {
        type = "NOT_FOUND_ERROR";
        backendErrorType = "NotFound";
      } else if (error.status === 422) {
        type = "TEXT_EXTRACTION_ERROR";
        backendErrorType = "UnprocessableEntity";
        retryable = true;
      } else if (error.status === 503) {
        type = "LLM_SERVICE_ERROR";
        backendErrorType = "ServiceUnavailable";
        retryable = true;
      } else if (error.status >= 500) {
        type = "SERVER_ERROR";
        retryable = true;
      }

      return {
        type,
        message: error.message,
        details: error.response,
        statusCode: error.status,
        timestamp: new Date().toISOString(),
        backendErrorType,
        retryable,
      };
    }

    return {
      type: "UNKNOWN_ERROR",
      message: (error as Error)?.message || "An unknown error occurred",
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Mock upload for testing without backend
   */
  private async mockUpload(
    imageUri: string,
    uploadRequest: UploadRequest,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResponse> {
    // Simulate upload progress with base64 conversion
    const stages = [
      {
        stage: "preparing" as const,
        percentage: 15,
        message: "Converting image to base64...",
      },
      {
        stage: "uploading" as const,
        percentage: 35,
        message: "Uploading base64 data...",
      },
      {
        stage: "uploading" as const,
        percentage: 65,
        message: "Uploading base64 data...",
      },
      {
        stage: "uploading" as const,
        percentage: 85,
        message: "Processing on server...",
      },
      {
        stage: "processing" as const,
        percentage: 95,
        message: "Analyzing label...",
      },
      {
        stage: "completed" as const,
        percentage: 100,
        message: "Upload completed!",
      },
    ];

    for (const stage of stages) {
      onProgress?.({
        loaded: stage.percentage,
        total: 100,
        percentage: stage.percentage,
        stage: stage.stage,
        message: stage.message,
      });
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Return comprehensive mock response with all workflow data
    const mockResponse: UploadResponse = {
      // Frontend fields
      id: `mock_${Date.now()}`,
      filename: `label_${Date.now()}.jpg`,
      url: imageUri,
      tags: uploadRequest.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        originalImageUri: imageUri,
        originalName: imageUri.split("/").pop() || "image.jpg",
        size: 1024000,
        mimeType: "image/jpeg",
        isMockResponse: true,
        uploadedAt: new Date().toISOString(),
      },
      
      // Core extraction data
      extractedText: "Product Name: Organic Apple Juice\nIngredients: Organic Apple Juice, Vitamin C\nCountry: United States\nManufacturer: Fresh Farms LLC\nNet Weight: 32 fl oz (946 mL)\nBest By: 12/31/2025",
      confidence: 0.95,
      processingTimeMs: 2500,
      
      // RAG result (mock regulations query)
      ragResult: {
        regulations: "FDA regulations for organic apple juice require products to contain at least 95% organic ingredients. Vitamin C fortification must comply with FDA guidelines for nutritional supplements. Export to international markets requires adherence to destination country regulations.",
        sources: [
          "FDA Title 21 CFR Part 101 - Food Labeling",
          "USDA NOP Standards - Organic Certification",
          "FDA Guidance for Industry - Food Labeling"
        ],
        confidence: 0.92,
        processing_time_ms: 1200,
        query: "organic apple juice vitamin C FDA regulations export compliance"
      },
      
      // Compliance result (mock validation)
      complianceResult: {
        is_compliant: true,
        ready_for_pdf: true,
        final_score: 87,
        risk_level: "LOW",
        validation_result: {
          success: true,
          compliance: {
            is_compliant: true,
            coverage_percent: 87,
            matched_count: 7,
            total_required: 8,
            partial_count: 1
          },
          issues: {
            missing_items: [],
            partial_matches: [
              {
                key: "export_certificate",
                requirement_text: "Export certificate required for international shipping",
                observed: "Certificate number partially visible"
              }
            ],
            conflicts: []
          },
          evidence: {
            product_name: "Organic Apple Juice",
            ingredients_list: "Organic Apple Juice, Vitamin C",
            country_of_origin: "United States",
            net_weight: "32 fl oz (946 mL)",
            organic_certification: "USDA Organic"
          },
          notes: "Product meets FDA organic standards with 100% organic apple juice and properly declared Vitamin C. All ingredients comply with US regulations for organic food products.",
          references: [
            "FDA-001: Organic Food Standards",
            "FDA-002: Vitamin C Fortification Guidelines"
          ]
        }
      },
      
      // Mock PDF report
      pdfReport: {
        pdf_base64: "JVBERi0xLjQKJcOkw7zDtsO4w6HEhMOkw7zDtsO4w6HEhMOkw7zDtsO4w6HEhMOkw7zDtsO4w6HEhMOkw7zDtsO4w6HEhMOkw7zDtsO4w6HEhA==", // Mock base64 PDF data
        filename: `compliance_report_organic_apple_juice_${new Date().toISOString().split('T')[0]}.pdf`,
        size: 2847,
        generated_at: new Date().toISOString(),
        compliance_status: true,
        coverage_percent: 87
      },
      
      // Workflow status
      workflowComplete: true,
      processingStages: {
        textExtraction: 'completed',
        ragQuery: 'completed',
        validation: 'completed',
        pdfGeneration: 'completed'
      }
    };

    return mockResponse;
  }

  /**
   * Upload image to backend
   */
  async uploadImage(
    imageUri: string,
    uploadRequest: UploadRequest,
    options: UploadOptions = {}
  ): Promise<UploadResponse> {
    const {
      onProgress,
      timeout = API_CONFIG.TIMEOUTS.UPLOAD,
      validateFile = true,
    } = options;

    try {
      // Update progress
      onProgress?.({
        loaded: 0,
        total: 100,
        percentage: 0,
        stage: "preparing",
        message: "Preparing upload...",
      });

      // Validate file if requested
      if (validateFile) {
        const validation = await this.validateImageFile(imageUri);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(", "));
        }
      }

      // Use mock upload if in mock mode
      if (API_CONFIG.MOCK_MODE) {
        console.log("🔧 Using mock upload mode - no real backend connection");
        return await this.mockUpload(imageUri, uploadRequest, onProgress);
      }

      // Convert image to base64 and create payload
      onProgress?.({
        loaded: 10,
        total: 100,
        percentage: 10,
        stage: "preparing",
        message: "Converting image to base64...",
      });

      const uploadPayload = await this.createUploadPayload(
        imageUri,
        uploadRequest
      );

      // Start upload
      onProgress?.({
        loaded: 30,
        total: 100,
        percentage: 30,
        stage: "uploading",
        message: "Uploading base64 data...",
      });

      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        onProgress?.({
          loaded: Math.min(85, Math.random() * 40 + 30),
          total: 100,
          percentage: Math.min(85, Math.random() * 40 + 30),
          stage: "uploading",
          message: "Uploading base64 data...",
        });
      }, 500);

      try {
        // Call API
        console.log(`Calling API: ${API_CONFIG.ENDPOINTS.EXTRACT_TEXT}`);
        const response = await this.apiService.post<any>(
          API_CONFIG.ENDPOINTS.EXTRACT_TEXT,
          uploadPayload,
          { timeout }
        );

        clearInterval(progressInterval);

        // 🔹 Print backend response to terminal for debugging
        console.log(
          "📡 Backend raw response:",
          JSON.stringify(response, null, 2)
        );

        // Update progress based on workflow completion
        const backendData = response.data?.data || response.data || {};
        const hasComplianceResult = !!backendData.compliance_result;
        const hasPdfReport = !!backendData.pdf_report;
        
        // Determine final progress message
        let finalMessage = "Text extraction completed successfully!";
        if (hasPdfReport) {
          finalMessage = "Complete workflow finished - PDF report ready!";
        } else if (hasComplianceResult) {
          finalMessage = "Compliance analysis completed!";
        }

        // Final progress update
        onProgress?.({
          loaded: 100,
          total: 100,
          percentage: 100,
          stage: "completed",
          message: finalMessage,
        });

        // 🔹 Build comprehensive frontend response with all backend data
        const transformedResponse: UploadResponse = {
          // Frontend fields
          id: `extraction_${Date.now()}`,
          filename: uploadRequest.metadata?.fileName || "image.jpg",
          url: imageUri,
          tags: uploadRequest.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {
            originalImageUri: imageUri,
            uploadedAt: new Date().toISOString(),
            ...uploadRequest.metadata,
          },
          
          // Core extraction data
          extractedText: backendData.extracted_text || "",
          confidence: backendData.confidence ?? null,
          processingTimeMs: backendData.processing_time_ms ?? null,
          
          // RAG result (regulations query)
          ragResult: backendData.rag_result ? {
            regulations: backendData.rag_result.regulations || "",
            sources: backendData.rag_result.sources || [],
            confidence: backendData.rag_result.confidence || 0,
            processing_time_ms: backendData.rag_result.processing_time_ms || 0,
            query: backendData.rag_result.query || "",
            validation: backendData.rag_result.validation
          } : undefined,
          
          // Compliance result
          complianceResult: backendData.compliance_result,
          
          // Validation result (detailed compliance analysis)
          validationResult: backendData.compliance_result?.validation_result,
          
          // PDF report
          pdfReport: backendData.pdf_report,
          
          // Workflow status
          workflowComplete: hasPdfReport || hasComplianceResult,
          processingStages: {
            textExtraction: backendData.extracted_text ? 'completed' : 'failed',
            ragQuery: backendData.rag_result ? 'completed' : 'skipped',
            validation: backendData.compliance_result ? 'completed' : 'skipped',
            pdfGeneration: backendData.pdf_report ? 'completed' : 'skipped',
          }
        };

        return transformedResponse;
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error) {
      onProgress?.({
        loaded: 0,
        total: 100,
        percentage: 0,
        stage: "error",
        message: "Upload failed",
      });

      const serviceError = this.convertToServiceError(error);

      // Provide user-friendly error messages based on error type
      let userMessage = serviceError.message;
      switch (serviceError.type) {
        case "NETWORK_ERROR":
          userMessage = ERROR_MESSAGES.NETWORK.NO_CONNECTION;
          break;
        case "TIMEOUT_ERROR":
          userMessage = ERROR_MESSAGES.NETWORK.TIMEOUT;
          break;
        case "SERVER_ERROR":
          userMessage = ERROR_MESSAGES.NETWORK.SERVER_ERROR;
          break;
        case "IMAGE_PROCESSING_ERROR":
          // Map specific backend errors to user-friendly messages
          switch (serviceError.backendErrorType) {
            case "Base64ValidationError":
              userMessage = ERROR_MESSAGES.IMAGE_PROCESSING.BASE64_VALIDATION_ERROR;
              break;
            case "ImageSizeError":
              userMessage = ERROR_MESSAGES.IMAGE_PROCESSING.IMAGE_SIZE_ERROR;
              break;
            case "UnsupportedImageTypeError":
              userMessage = ERROR_MESSAGES.IMAGE_PROCESSING.UNSUPPORTED_IMAGE_TYPE;
              break;
            case "ImageProcessingError":
              userMessage = ERROR_MESSAGES.IMAGE_PROCESSING.IMAGE_PROCESSING_ERROR;
              break;
            default:
              userMessage = ERROR_MESSAGES.IMAGE_PROCESSING.IMAGE_PROCESSING_ERROR;
          }
          break;
        case "TEXT_EXTRACTION_ERROR":
          userMessage = ERROR_MESSAGES.IMAGE_PROCESSING.TEXT_EXTRACTION_ERROR;
          break;
        case "LLM_SERVICE_ERROR":
          if (serviceError.backendErrorType === "LLMServiceTimeoutError") {
            userMessage = ERROR_MESSAGES.LLM_SERVICE.TIMEOUT_ERROR;
          } else {
            userMessage = ERROR_MESSAGES.LLM_SERVICE.SERVICE_ERROR;
          }
          break;
        case "RAG_SERVICE_ERROR":
          userMessage = ERROR_MESSAGES.RAG.REGULATIONS_QUERY_FAILED;
          break;
        case "VALIDATION_SERVICE_ERROR":
          userMessage = ERROR_MESSAGES.VALIDATION.COMPLIANCE_CHECK_FAILED;
          break;
        case "PDF_GENERATION_ERROR":
          userMessage = ERROR_MESSAGES.PDF.GENERATION_FAILED;
          break;
        case "VALIDATION_ERROR":
          userMessage = serviceError.message || ERROR_MESSAGES.UPLOAD.UPLOAD_FAILED;
          break;
        case "AUTHENTICATION_ERROR":
          userMessage = "Authentication failed. Please log in again.";
          break;
        case "AUTHORIZATION_ERROR":
          userMessage = "You do not have permission to perform this action.";
          break;
        case "NOT_FOUND_ERROR":
          userMessage = "The requested resource was not found.";
          break;
        default:
          userMessage = ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR;
      }

      throw new Error(userMessage);
    }
  }

  /**
   * Retry upload with exponential backoff
   */
  async uploadImageWithRetry(
    imageUri: string,
    uploadRequest: UploadRequest,
    options: UploadOptions & { maxRetries?: number } = {}
  ): Promise<UploadResponse> {
    const { maxRetries = 3, ...uploadOptions } = options;
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.uploadImage(imageUri, uploadRequest, uploadOptions);
      } catch (error) {
        lastError = error as Error;

        // Don't retry validation errors
        if (
          lastError.message.includes("Invalid file format") ||
          lastError.message.includes("File size exceeds")
        ) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }

  async checkHealth(): Promise<boolean> {
    // Example implementation: ping the backend health endpoint
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create singleton instance
export const uploadService = new UploadService();
