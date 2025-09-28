/**
 * Services barrel export
 * Provides easy access to all services from a single import
 */

export { ApiError, ApiService } from './api';
export { ErrorHandler, debounce, withLoading } from './errorHandler';
export { UploadService, uploadService } from './uploadService';
export { PDFService, pdfService } from './pdfService';

// Re-export types for convenience
export type {
    ServiceError, UploadOptions,
    UploadProgress, UploadRequest,
    UploadResponse, PDFReport,
    ComplianceResult, ValidationResult,
    RAGResult, TextExtractionResponse
} from '../types/api';
export type { ApiResponse, RequestConfig } from './api';
export type { PDFDownloadOptions, PDFDownloadResult } from './pdfService';
