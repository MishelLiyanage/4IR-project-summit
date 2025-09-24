/**
 * TypeScript interfaces for API requests and responses
 */

// Base response interface
export interface BaseApiResponse {
  success: boolean;
  message?: string;
  timestamp?: string;
}

// Error response interface
export interface ApiErrorResponse extends BaseApiResponse {
  success: false;
  error: string;
  code?: string;
  details?: any;
}

// Success response interface
export interface ApiSuccessResponse<T = any> extends BaseApiResponse {
  success: true;
  data: T;
}

// Union type for all API responses
export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Upload-related interfaces
export interface UploadRequest {
  description: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UploadedImage {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

export interface UploadResponse {
  image: UploadedImage;
  processing?: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    extractedText?: string;
    confidence?: number;
    processingTime?: number;
  };
}

// Label-related interfaces
export interface Label {
  id: string;
  description: string;
  image: UploadedImage;
  tags: string[];
  extractedText?: string;
  metadata: {
    uploadedBy?: string;
    uploadedAt: string;
    deviceInfo?: DeviceInfo;
    location?: GeolocationInfo;
  };
  status: 'active' | 'archived' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabelRequest {
  description: string;
  tags?: string[];
  metadata?: {
    deviceInfo?: DeviceInfo;
    location?: GeolocationInfo;
  };
}

export interface UpdateLabelRequest {
  description?: string;
  tags?: string[];
  status?: 'active' | 'archived' | 'deleted';
}

// Pagination interfaces
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Filter and search interfaces
export interface LabelFilters {
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  status?: 'active' | 'archived' | 'deleted';
  hasExtractedText?: boolean;
}

export interface SearchLabelsRequest extends PaginationParams {
  query?: string;
  filters?: LabelFilters;
}

// Device and location info
export interface DeviceInfo {
  platform: 'ios' | 'android' | 'web';
  osVersion?: string;
  appVersion: string;
  deviceModel?: string;
  screenDimensions?: {
    width: number;
    height: number;
  };
}

export interface GeolocationInfo {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: string;
}

// Upload progress interface
export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  stage: 'preparing' | 'uploading' | 'processing' | 'completed' | 'error';
  message?: string;
}

// File validation interface
export interface FileValidation {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  fileInfo?: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  };
}

// Service method options
export interface UploadOptions {
  onProgress?: (progress: UploadProgress) => void;
  timeout?: number;
  retries?: number;
  validateFile?: boolean;
}

export interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

// Authentication interfaces (for future use)
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'user' | 'admin';
  preferences: {
    autoUpload: boolean;
    imageQuality: number;
    maxFileSize: number;
  };
  createdAt: string;
  lastLoginAt: string;
}

// Error types
export type ApiErrorType = 
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'SERVER_ERROR'
  | 'UNKNOWN_ERROR';

export interface ServiceError {
  type: ApiErrorType;
  message: string;
  details?: any;
  statusCode?: number;
  timestamp: string;
}