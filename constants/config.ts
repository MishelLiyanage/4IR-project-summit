/**
 * Application configuration constants
 */

export const API_CONFIG = {
  // Base URL for the API - update this with your actual backend URL
  BASE_URL: __DEV__ 
    ? 'http://192.168.1.6:8000'  // Development - your 4IR backend (use your machine's IP)
    : 'https://your-production-api.com', // Production
  
  // Mock mode for testing without backend
  MOCK_MODE: false, // Set to true for testing without backend

  // API endpoints - matching 4IR backend structure
  ENDPOINTS: {
    // Image processing endpoints
    EXTRACT_TEXT: '/images/extract-text',
    IMAGE_HEALTH: '/images/health',
    
    // RAG endpoints
    RAG_QUERY: '/rag/query-regulations',
    RAG_FORMAT_QUERY: '/rag/format-query',
    RAG_HEALTH: '/rag/health',
    
    // Validation endpoints
    VALIDATE_COMPLIANCE: '/validation/validate-compliance',
    FORMAT_VALIDATION_QUERY: '/validation/format-query',
    VALIDATION_HEALTH: '/validation/health',
    
    // User endpoints
    USERS: '/users',
    USER_BY_ID: '/users/{id}',
    USER_BY_EMAIL: '/users/email/{email}',
    
    // General health
    HEALTH: '/health',
    
    // Legacy endpoints (deprecated)
    UPLOAD_LABEL: '/labels/upload',
    LABELS: '/labels',
  },

  // Request timeouts (in milliseconds)
  TIMEOUTS: {
    DEFAULT: 30000,  // 30 seconds
    UPLOAD: 120000,  // 2 minutes for uploads
  },

  // Upload configuration
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes (before base64 encoding)
    MAX_BASE64_SIZE: 14 * 1024 * 1024, // ~13.3MB (after base64 encoding, +33% overhead)
    ALLOWED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    QUALITY: 0.8,
  },
} as const;

export const APP_CONFIG = {
  // App metadata
  NAME: 'Label Photo Scanner',
  VERSION: '1.0.0',

  // Feature flags
  FEATURES: {
    OFFLINE_MODE: false,
    AUTO_UPLOAD: false,
    BATCH_UPLOAD: false,
  },

  // Storage keys for AsyncStorage/SecureStore
  STORAGE_KEYS: {
    AUTH_TOKEN: 'auth_token',
    USER_PREFERENCES: 'user_preferences',
    CACHED_IMAGES: 'cached_images',
  },
} as const;

export const ERROR_MESSAGES = {
  NETWORK: {
    NO_CONNECTION: 'No internet connection. Please check your network and try again.',
    TIMEOUT: 'Request timed out. Please try again.',
    SERVER_ERROR: 'Server error occurred. Please try again later.',
  },
  UPLOAD: {
    FILE_TOO_LARGE: `File size exceeds ${API_CONFIG.UPLOAD.MAX_FILE_SIZE / (1024 * 1024)}MB limit.`,
    INVALID_FORMAT: 'Invalid file format. Please select a valid image file.',
    UPLOAD_FAILED: 'Failed to upload image. Please try again.',
  },
  IMAGE_PROCESSING: {
    BASE64_VALIDATION_ERROR: 'Invalid image data. Please try taking a new photo.',
    IMAGE_SIZE_ERROR: 'Image size is not supported. Please try a different image.',
    UNSUPPORTED_IMAGE_TYPE: 'Image format not supported. Please use JPEG, PNG, or WebP.',
    IMAGE_PROCESSING_ERROR: 'Failed to process image. Please try again.',
    TEXT_EXTRACTION_ERROR: 'Could not extract text from image. Please ensure the image is clear.',
  },
  LLM_SERVICE: {
    TIMEOUT_ERROR: 'Text analysis took too long. Please try again.',
    SERVICE_ERROR: 'Analysis service is temporarily unavailable. Please try again later.',
    SERVICE_UNAVAILABLE: 'Text analysis service is down. Please try again later.',
  },
  VALIDATION: {
    COMPLIANCE_CHECK_FAILED: 'Failed to check compliance. Please try again.',
    VALIDATION_TIMEOUT: 'Compliance validation took too long. Please try again.',
    INVALID_VALIDATION_DATA: 'Invalid data for compliance check.',
  },
  RAG: {
    REGULATIONS_QUERY_FAILED: 'Failed to find relevant regulations. Please try again.',
    RAG_TIMEOUT: 'Regulation search took too long. Please try again.',
    NO_REGULATIONS_FOUND: 'No relevant regulations found for this product.',
  },
  PDF: {
    GENERATION_FAILED: 'Failed to generate PDF report. Please try again.',
    DOWNLOAD_FAILED: 'Failed to download PDF. Please try again.',
    SAVE_FAILED: 'Failed to save PDF to device. Please check storage permissions.',
  },
  CAMERA: {
    PERMISSION_DENIED: 'Camera permission is required to take photos.',
    CAPTURE_FAILED: 'Failed to capture photo. Please try again.',
  },
  GENERAL: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
    FEATURE_NOT_AVAILABLE: 'This feature is not available right now.',
  },
} as const;

// Environment check helper
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;

// Platform-specific configurations
export const PLATFORM_CONFIG = {
  IOS: {
    CAMERA_QUALITY: 0.8,
    HAPTIC_FEEDBACK: true,
  },
  ANDROID: {
    CAMERA_QUALITY: 0.8,
    HAPTIC_FEEDBACK: true,
  },
  WEB: {
    CAMERA_QUALITY: 0.9,
    HAPTIC_FEEDBACK: false,
  },
} as const;