/**
 * TypeScript interfaces for API requests and responses
 * Updated to match 4IR backend structure
 */

// ================== 4IR BACKEND TYPES ==================

// Backend response structure (matches BaseController responses)
export interface BackendResponse<T = any> {
  status: 'success' | 'error';
  status_code: number;
  data?: T;
  error?: {
    message: string;
    type: string;
  };
}

// Text extraction response (from ImageController)
export interface TextExtractionResponse {
  extracted_text: string;
  confidence?: number;
  processing_time_ms: number;
  rag_result?: RAGResult;
  compliance_result?: ComplianceResult;
  pdf_report?: PDFReport;
}

// RAG (Regulations) result
export interface RAGResult {
  regulations: string;
  sources: string[];
  confidence: number;
  processing_time_ms: number;
  query: string;
  validation?: ValidationResult;
}

// Compliance/Validation result
export interface ComplianceResult {
  is_compliant: boolean;
  ready_for_pdf: boolean;
  final_score: number;
  risk_level: string;
  validation_result: ValidationResult;
  pdf_generated?: boolean;
  pdf_filename?: string;
  pdf_error?: string;
}

// Detailed validation result structure
export interface ValidationResult {
  success: boolean;
  compliance: {
    is_compliant: boolean;
    coverage_percent: number;
    matched_count: number;
    total_required: number;
    partial_count: number;
  };
  issues: {
    missing_items: Array<{
      key: string;
      requirement_text: string;
    }>;
    partial_matches: Array<{
      key: string;
      requirement_text: string;
      observed: string;
    }>;
    conflicts: Array<{
      type: string;
      detail: string;
      observed: string;
    }>;
  };
  evidence: Record<string, string>;
  notes?: string;
  references?: string[];
}

// PDF Report structure
export interface PDFReport {
  pdf_base64: string;
  filename: string;
  size: number;
  generated_at: string;
  compliance_status?: boolean;
  coverage_percent?: number;
}

// Request structure for image processing
export interface ImageProcessingRequest {
  encoded_image: string; // base64 string
  media_type?: string;
  metadata?: {
    fileName?: string;
    size?: number;
    tags?: string[];
    deviceInfo?: DeviceInfo;
    uploadedAt?: string;
    [key: string]: any;
  };
}

// ================== LEGACY/FRONTEND TYPES ==================

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

// ================== ERROR TYPES ==================

// Backend error types (matching backend exceptions)
export type BackendErrorType = 
  | 'Base64ValidationError'
  | 'ImageSizeError' 
  | 'UnsupportedImageTypeError'
  | 'ImageProcessingError'
  | 'LLMServiceTimeoutError'
  | 'LLMServiceError'
  | 'TextExtractionError'
  | 'RequestTimeout'
  | 'ServiceUnavailable'
  | 'UnprocessableEntity'
  | 'NotFound'
  | 'ValidationError';

// Frontend error types for UI handling
export type ApiErrorType =
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'
  | 'SERVER_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'VALIDATION_ERROR'
  | 'IMAGE_PROCESSING_ERROR'
  | 'TEXT_EXTRACTION_ERROR'
  | 'LLM_SERVICE_ERROR'
  | 'RAG_SERVICE_ERROR'
  | 'VALIDATION_SERVICE_ERROR'
  | 'PDF_GENERATION_ERROR'
  | 'UNKNOWN_ERROR';

// Enhanced service error interface
export interface ServiceError {
  type: ApiErrorType;
  message: string;
  details?: any;
  statusCode?: number;
  timestamp: string;
  backendErrorType?: BackendErrorType;
  retryable?: boolean;
}

// ================== UPLOAD INTERFACES ==================

// Upload-related interfaces
export interface UploadRequest {
  tags?: string[];
  metadata?: Record<string, any>;
}

// Base64 upload request interface
export interface Base64UploadRequest {
  image: {
    data: string; // base64 encoded image data
    mimeType: string; // e.g., 'image/jpeg', 'image/png'
    fileName: string; // original filename
    size: number; // file size in bytes
  };
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

// Enhanced upload response with backend data
export interface UploadResponse {
  // Frontend generated fields
  id: string;
  filename: string;
  url: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, any>;
  
  // Backend response fields
  extractedText: string;
  confidence?: number;
  processingTimeMs?: number;
  
  // New backend integration fields
  ragResult?: RAGResult;
  complianceResult?: ComplianceResult;
  validationResult?: ValidationResult;
  pdfReport?: PDFReport;
  
  // Processing status
  workflowComplete?: boolean;
  processingStages?: {
    textExtraction: 'pending' | 'completed' | 'failed';
    ragQuery: 'pending' | 'completed' | 'failed' | 'skipped';
    validation: 'pending' | 'completed' | 'failed' | 'skipped';
    pdfGeneration: 'pending' | 'completed' | 'failed' | 'skipped';
  };
}

// Legacy upload response (kept for compatibility)
export interface LegacyUploadResponse {
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
  tags?: string[];
  metadata?: {
    deviceInfo?: DeviceInfo;
    location?: GeolocationInfo;
  };
}

export interface UpdateLabelRequest {
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

// Note: Error types moved to the beginning of file to avoid duplicates