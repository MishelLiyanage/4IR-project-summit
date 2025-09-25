/**
 * Application configuration constants
 */

export const API_CONFIG = {
  // Base URL for the API - update this with your actual backend URL
  BASE_URL: __DEV__ 
    ? 'http://localhost:8000'  // Development - your 4IR backend
    : 'https://your-production-api.com', // Production
  
  // Mock mode for testing without backend
  MOCK_MODE: false, // Set to true for testing without backend

  // API endpoints
  ENDPOINTS: {
    EXTRACT_TEXT: '/images/extract-text',
    IMAGE_HEALTH: '/images/health',
    HEALTH: '/health',
    UPLOAD_LABEL: '/labels/upload', // Legacy endpoint
    LABELS: '/labels', // Legacy endpoint
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
  CAMERA: {
    PERMISSION_DENIED: 'Camera permission is required to take photos.',
    CAPTURE_FAILED: 'Failed to capture photo. Please try again.',
  },
  GENERAL: {
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
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