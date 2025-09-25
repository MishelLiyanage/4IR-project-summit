# Services Architecture Documentation
### **Upload Service (`uploadService.ts`)**

Specialized service for handling image uploads as base64 with progress tracking, validation, and retry logic.

**Features:**
- Image file validation (size, format)
- Base64 conversion with progress tracking
- Progress tracking with callbacks
- Retry mechanism with exponential backoff
- Device information collection
- JSON payload construction for base64 uploads
- Comprehensive error handlingctory contains the service layer for the Label Photo Scanner app, implementing a clean architecture pattern for handling API communications and business logic.

## Architecture Overview

```
services/
├── api.ts              # Base API service with HTTP methods
├── uploadService.ts    # Image upload functionality  
├── errorHandler.ts     # Error handling utilities
└── index.ts           # Barrel exports
```

## Services

### ApiService (`api.ts`)

Base service class providing common HTTP operations with proper error handling, timeout management, and authentication support.

**Features:**
- RESTful HTTP methods (GET, POST, PUT, PATCH, DELETE)
- File upload support with FormData
- Automatic JSON parsing
- Request/response interceptors
- Authentication token management
- Timeout handling
- Error standardization

**Usage:**
```typescript
import { ApiService } from './services/api';

const api = new ApiService('https://api.example.com');
api.setAuthToken('your-token');

const response = await api.get('/endpoint');
```

### UploadService (`uploadService.ts`)

Specialized service for handling image uploads with progress tracking, validation, and retry logic.

**Features:**
- Image file validation (size, format)
- Progress tracking with callbacks
- Retry mechanism with exponential backoff
- Device information collection
- FormData construction for multipart uploads
- Comprehensive error handling

**Usage:**
```typescript
import { uploadService } from './services/uploadService';

const result = await uploadService.uploadImage(
  imageUri,
  { tags: ['product', 'inventory'] },
  {
    onProgress: (progress) => console.log(progress.percentage),
    maxRetries: 3,
  }
);
```

### ErrorHandler (`errorHandler.ts`)

Centralized error handling with user-friendly messages, logging, and retry capabilities.

**Features:**
- User-friendly error messages
- Error logging for debugging
- Haptic feedback on errors
- Retry logic for recoverable errors
- Context-aware error handling
- Utility functions (debounce, withLoading)

**Usage:**
```typescript
import { ErrorHandler } from './services/errorHandler';

try {
  await riskyOperation();
} catch (error) {
  ErrorHandler.handleUploadError(error, () => retryFunction());
}
```

## Configuration

### API Configuration (`constants/config.ts`)

```typescript
export const API_CONFIG = {
  BASE_URL: __DEV__ 
    ? 'http://localhost:3000/api'    // Development
    : 'https://your-api.com/api',    // Production
  
  ENDPOINTS: {
    UPLOAD_LABEL: '/labels/upload',
    LABELS: '/labels',
  },
  
  UPLOAD: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FORMATS: ['image/jpeg', 'image/png'],
  },
};
```

## Types (`types/api.ts`)

Comprehensive TypeScript interfaces for:
- API requests/responses
- Upload operations
- Error handling
- Progress tracking
- Device information
- Pagination

## Backend Integration

To connect with your backend, update the following:

1. **Base URL** in `constants/config.ts`:
   ```typescript
   BASE_URL: 'https://your-backend-url.com/api'
   ```

2. **Endpoints** configuration:
   ```typescript
   ENDPOINTS: {
     UPLOAD_LABEL: '/api/labels/upload',
     // Add other endpoints
   }
   ```

3. **Authentication** (if required):
   ```typescript
   uploadService.setAuthToken('your-jwt-token');
   ```

## Expected Backend API

The upload service expects the following API contract:

### POST `/labels/upload`

**Request:**
- Method: `POST`
- Content-Type: `application/json`
- Body:
  ```json
  {
    "image": {
      "data": "base64-encoded-image-data",
      "mimeType": "image/jpeg",
      "fileName": "photo.jpg",
      "size": 1024000
    },
    "tags": ["tag1", "tag2"],
    "metadata": { "uploadSource": "mobile_app" }
  }
  ```

**Response:**
```json
{
  "success": true,
  "data": {
    "image": {
      "id": "uuid",
      "filename": "processed_name.jpg",
      "url": "https://storage.example.com/images/uuid.jpg",
      "size": 1234567,
      "uploadedAt": "2023-01-01T00:00:00Z"
    },
    "processing": {
      "status": "completed",
      "extractedText": "Label text content",
      "confidence": 0.95
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "File size exceeds limit",
  "code": "FILE_TOO_LARGE"
}
```

## Error Handling

The service layer provides comprehensive error handling:

- **Network errors**: Automatic retry with exponential backoff
- **Validation errors**: User-friendly messages without retry
- **Server errors**: Retry capability with user notification
- **Timeout errors**: Configurable timeouts with retry options

## Testing

To test the services:

1. **Mock API responses** in development
2. **Test error scenarios** (network failures, invalid files)
3. **Verify progress callbacks** work correctly
4. **Test retry mechanisms** with temporary failures

## Best Practices

1. **Always handle errors** gracefully with user feedback
2. **Use progress callbacks** for long-running operations
3. **Validate files** before upload to prevent server load
4. **Log errors** for debugging and monitoring
5. **Set appropriate timeouts** for different operations
6. **Use retry logic** for transient failures only

## Future Enhancements

- [ ] Offline queue for failed uploads
- [ ] Background upload support
- [ ] Multiple file uploads
- [ ] Upload cancellation
- [ ] Bandwidth optimization
- [ ] Analytics integration