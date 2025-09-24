/**
 * Upload service for handling image uploads to the backend
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { API_CONFIG, APP_CONFIG, ERROR_MESSAGES } from '../constants/config';
import type {
    ApiErrorType,
    DeviceInfo,
    FileValidation,
    ServiceError,
    UploadOptions,
    UploadProgress,
    UploadRequest,
    UploadResponse,
} from '../types/api';
import { ApiError, ApiService } from './api';

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
        errors.push('File does not exist');
        return { isValid: false, errors, warnings };
      }

      // Check file size
      if (fileInfo.size && fileInfo.size > API_CONFIG.UPLOAD.MAX_FILE_SIZE) {
        errors.push(ERROR_MESSAGES.UPLOAD.FILE_TOO_LARGE);
      }

      // For React Native, we might not have direct MIME type access
      // We'll infer from file extension or trust the file picker
      const fileName = imageUri.split('/').pop() || '';
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      const validExtensions = ['jpg', 'jpeg', 'png', 'webp'];
      if (fileExtension && !validExtensions.includes(fileExtension)) {
        errors.push(ERROR_MESSAGES.UPLOAD.INVALID_FORMAT);
      }

      // Add warnings for large files (but not errors)
      if (fileInfo.size && fileInfo.size > 5 * 1024 * 1024) { // 5MB
        warnings.push('Large file size may take longer to upload');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileInfo: fileInfo.exists ? {
          name: fileName,
          size: fileInfo.size || 0,
          type: this.getMimeTypeFromExtension(fileExtension || ''),
          lastModified: fileInfo.modificationTime || Date.now(),
        } : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate file'],
        warnings,
      };
    }
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
    };
    return mimeTypes[extension.toLowerCase()] || 'image/jpeg';
  }

  /**
   * Get device information
   */
  private getDeviceInfo(): DeviceInfo {
    return {
      platform: Platform.OS as 'ios' | 'android' | 'web',
      osVersion: Platform.Version?.toString(),
      appVersion: APP_CONFIG.VERSION,
      deviceModel: Platform.OS === 'ios' 
        ? (Platform.constants as any)?.deviceName 
        : (Platform.constants as any)?.model || 'Unknown',
      screenDimensions: {
        width: 0, // We'll get this from Dimensions API if needed
        height: 0,
      },
    };
  }

  /**
   * Create FormData for image upload
   */
  private async createUploadFormData(
    imageUri: string,
    uploadRequest: UploadRequest
  ): Promise<FormData> {
    const formData = new FormData();

    // Get file name from URI
    const fileName = imageUri.split('/').pop() || `image_${Date.now()}.jpg`;
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeType = this.getMimeTypeFromExtension(fileExtension);

    // Add image file
    formData.append('image', {
      uri: imageUri,
      type: mimeType,
      name: fileName,
    } as any);

    // Add description
    formData.append('description', uploadRequest.description);

    // Add tags if provided
    if (uploadRequest.tags && uploadRequest.tags.length > 0) {
      formData.append('tags', JSON.stringify(uploadRequest.tags));
    }

    // Add metadata
    const metadata = {
      ...uploadRequest.metadata,
      deviceInfo: this.getDeviceInfo(),
      uploadedAt: new Date().toISOString(),
    };
    formData.append('metadata', JSON.stringify(metadata));

    return formData;
  }

  /**
   * Convert API error to service error
   */
  private convertToServiceError(error: unknown): ServiceError {
    if (error instanceof ApiError) {
      let type: ApiErrorType = 'UNKNOWN_ERROR';
      
      if (error.status === 0) {
        type = 'NETWORK_ERROR';
      } else if (error.status === 408) {
        type = 'TIMEOUT_ERROR';
      } else if (error.status >= 400 && error.status < 500) {
        if (error.status === 401) type = 'AUTHENTICATION_ERROR';
        else if (error.status === 403) type = 'AUTHORIZATION_ERROR';
        else if (error.status === 404) type = 'NOT_FOUND_ERROR';
        else type = 'VALIDATION_ERROR';
      } else if (error.status >= 500) {
        type = 'SERVER_ERROR';
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
      type: 'UNKNOWN_ERROR',
      message: (error as Error)?.message || 'An unknown error occurred',
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
    // Simulate upload progress
    const stages = [
      { stage: 'preparing' as const, percentage: 10, message: 'Preparing upload...' },
      { stage: 'uploading' as const, percentage: 30, message: 'Uploading image...' },
      { stage: 'uploading' as const, percentage: 60, message: 'Uploading image...' },
      { stage: 'uploading' as const, percentage: 85, message: 'Processing image...' },
      { stage: 'processing' as const, percentage: 95, message: 'Analyzing label...' },
      { stage: 'completed' as const, percentage: 100, message: 'Upload completed!' },
    ];

    for (const stage of stages) {
      onProgress?.({
        loaded: stage.percentage,
        total: 100,
        percentage: stage.percentage,
        stage: stage.stage,
        message: stage.message,
      });
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Return mock response
    return {
      image: {
        id: `mock_${Date.now()}`,
        filename: `label_${Date.now()}.jpg`,
        originalName: imageUri.split('/').pop() || 'image.jpg',
        size: 1024000, // 1MB mock size
        mimeType: 'image/jpeg',
        url: imageUri, // Use original URI for display
        uploadedAt: new Date().toISOString(),
      },
      processing: {
        status: 'completed',
        extractedText: 'Sample Label Text - This is a mock response',
        confidence: 0.85,
        processingTime: 2500,
      },
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
        stage: 'preparing',
        message: 'Preparing upload...',
      });

      // Validate file if requested
      if (validateFile) {
        const validation = await this.validateImageFile(imageUri);
        if (!validation.isValid) {
          throw new Error(validation.errors.join(', '));
        }
      }

      // Use mock upload if in mock mode
      if (API_CONFIG.MOCK_MODE) {
        console.log('🔧 Using mock upload mode - no real backend connection');
        return await this.mockUpload(imageUri, uploadRequest, onProgress);
      }

      // Create FormData for real upload
      onProgress?.({
        loaded: 10,
        total: 100,
        percentage: 10,
        stage: 'preparing',
        message: 'Preparing image data...',
      });

      const formData = await this.createUploadFormData(imageUri, uploadRequest);

      // Start upload
      onProgress?.({
        loaded: 20,
        total: 100,
        percentage: 20,
        stage: 'uploading',
        message: 'Uploading image...',
      });

      // Simulate progress during upload (in real implementation, you might get actual progress)
      const progressInterval = setInterval(() => {
        onProgress?.({
          loaded: Math.min(80, Math.random() * 60 + 20),
          total: 100,
          percentage: Math.min(80, Math.random() * 60 + 20),
          stage: 'uploading',
          message: 'Uploading image...',
        });
      }, 500);

      try {
        const response = await this.apiService.upload<UploadResponse>(
          API_CONFIG.ENDPOINTS.UPLOAD_LABEL,
          formData,
          { timeout }
        );

        clearInterval(progressInterval);

        // Final progress update
        onProgress?.({
          loaded: 100,
          total: 100,
          percentage: 100,
          stage: 'completed',
          message: 'Upload completed successfully!',
        });

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Upload failed');
        }

        return response.data;
      } finally {
        clearInterval(progressInterval);
      }
    } catch (error) {
      onProgress?.({
        loaded: 0,
        total: 100,
        percentage: 0,
        stage: 'error',
        message: 'Upload failed',
      });

      const serviceError = this.convertToServiceError(error);
      
      // Provide user-friendly error messages
      let userMessage = serviceError.message;
      switch (serviceError.type) {
        case 'NETWORK_ERROR':
          userMessage = ERROR_MESSAGES.NETWORK.NO_CONNECTION;
          break;
        case 'TIMEOUT_ERROR':
          userMessage = ERROR_MESSAGES.NETWORK.TIMEOUT;
          break;
        case 'SERVER_ERROR':
          userMessage = ERROR_MESSAGES.NETWORK.SERVER_ERROR;
          break;
        case 'VALIDATION_ERROR':
          userMessage = serviceError.message || ERROR_MESSAGES.UPLOAD.UPLOAD_FAILED;
          break;
        default:
          userMessage = ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR;
      }

      throw new Error(userMessage);
    }
  }

  /**
   * Check if backend is available
   */
  async checkHealth(): Promise<boolean> {
    if (API_CONFIG.MOCK_MODE) {
      return true; // Always available in mock mode
    }

    try {
      const response = await this.apiService.get(API_CONFIG.ENDPOINTS.HEALTH, {
        timeout: 5000, // 5 seconds timeout for health check
      });
      return response.success;
    } catch (error) {
      console.warn('Backend health check failed:', error);
      return false;
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
        if (lastError.message.includes('Invalid file format') || 
            lastError.message.includes('File size exceeds')) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }
}

// Create singleton instance
export const uploadService = new UploadService();