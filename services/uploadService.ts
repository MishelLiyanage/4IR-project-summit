import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { API_CONFIG, APP_CONFIG, ERROR_MESSAGES } from "../constants/config";
import type {
  ApiErrorType,
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
   * Convert API error to service error
   */
  private convertToServiceError(error: unknown): ServiceError {
    if (error instanceof ApiError) {
      let type: ApiErrorType = "UNKNOWN_ERROR";

      if (error.status === 0) {
        type = "NETWORK_ERROR";
      } else if (error.status === 408) {
        type = "TIMEOUT_ERROR";
      } else if (error.status >= 400 && error.status < 500) {
        if (error.status === 401) type = "AUTHENTICATION_ERROR";
        else if (error.status === 403) type = "AUTHORIZATION_ERROR";
        else if (error.status === 404) type = "NOT_FOUND_ERROR";
        else type = "VALIDATION_ERROR";
      } else if (error.status >= 500) {
        type = "SERVER_ERROR";
      }

      return {
        type,
        message: error.message,
        details: error.response,
        statusCode: error.status,
        timestamp: new Date().toISOString(),
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

    // Return mock response in new format
    return {
      id: `mock_${Date.now()}`,
      filename: `label_${Date.now()}.jpg`,
      url: imageUri, // Use original URI for display
      extractedText:
        "Sample Label Text - This is a mock response for testing without backend connection",
      confidence: 0.85,
      processingTimeMs: 2500,
      metadata: {
        originalName: imageUri.split("/").pop() || "image.jpg",
        size: 1024000, // 1MB mock size
        mimeType: "image/jpeg",
        isMockResponse: true,
      },
      tags: uploadRequest.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
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

        // Final progress update
        onProgress?.({
          loaded: 100,
          total: 100,
          percentage: 100,
          stage: "completed",
          message: "Text extraction completed successfully!",
        });

        // Use backend data only if needed
        const backendData = response.data?.data || response.data || {};

        // 🔹 Build your own frontend response
        const transformedResponse: UploadResponse = {
          id: `extraction_${Date.now()}`,
          filename: uploadRequest.metadata?.fileName || "image.jpg",
          url: imageUri,
          extractedText: backendData.extracted_text || "",
          confidence: backendData.confidence ?? null,
          processingTimeMs: backendData.processing_time_ms ?? null,
          metadata: {
            ...backendData.image_metadata,
            uploadedAt: new Date().toISOString(),
          },
          tags: uploadRequest.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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

      // Provide user-friendly error messages
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
        case "VALIDATION_ERROR":
          userMessage =
            serviceError.message || ERROR_MESSAGES.UPLOAD.UPLOAD_FAILED;
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
