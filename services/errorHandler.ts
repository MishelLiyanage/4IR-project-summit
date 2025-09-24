/**
 * Error handling utilities and service
 */

import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';
import { ERROR_MESSAGES } from '../constants/config';
import type { ApiErrorType, ServiceError } from '../types/api';

export class ErrorHandler {
  /**
   * Show user-friendly error message
   */
  static showError(
    error: Error | ServiceError | string,
    options: {
      title?: string;
      showRetry?: boolean;
      onRetry?: () => void;
      hapticFeedback?: boolean;
    } = {}
  ): void {
    const {
      title = 'Error',
      showRetry = false,
      onRetry,
      hapticFeedback = true,
    } = options;

    // Trigger haptic feedback for errors
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {
        // Ignore haptic errors
      });
    }

    let message: string;
    let isRetryable = false;

    if (typeof error === 'string') {
      message = error;
    } else if ('type' in error) {
      // ServiceError
      const serviceError = error as ServiceError;
      message = this.getErrorMessage(serviceError.type, serviceError.message);
      isRetryable = this.isRetryableError(serviceError.type);
    } else {
      // Regular Error
      message = error.message || ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR;
    }

    const buttons: any[] = [];

    if (showRetry && onRetry && isRetryable) {
      buttons.push({ text: 'Retry', onPress: onRetry });
      buttons.push({ text: 'Cancel', style: 'cancel' });
    } else {
      buttons.push({ text: 'OK' });
    }

    Alert.alert(title, message, buttons);
  }

  /**
   * Get user-friendly error message based on error type
   */
  private static getErrorMessage(type: ApiErrorType, originalMessage: string): string {
    switch (type) {
      case 'NETWORK_ERROR':
        return ERROR_MESSAGES.NETWORK.NO_CONNECTION;
      case 'TIMEOUT_ERROR':
        return ERROR_MESSAGES.NETWORK.TIMEOUT;
      case 'SERVER_ERROR':
        return ERROR_MESSAGES.NETWORK.SERVER_ERROR;
      case 'AUTHENTICATION_ERROR':
        return 'Authentication failed. Please log in again.';
      case 'AUTHORIZATION_ERROR':
        return 'You do not have permission to perform this action.';
      case 'NOT_FOUND_ERROR':
        return 'The requested resource was not found.';
      case 'VALIDATION_ERROR':
        return originalMessage || 'Invalid data provided.';
      default:
        return ERROR_MESSAGES.GENERAL.UNKNOWN_ERROR;
    }
  }

  /**
   * Check if error is retryable
   */
  private static isRetryableError(type: ApiErrorType): boolean {
    return [
      'NETWORK_ERROR',
      'TIMEOUT_ERROR',
      'SERVER_ERROR',
    ].includes(type);
  }

  /**
   * Log error for debugging/analytics
   */
  static logError(
    error: Error | ServiceError,
    context?: {
      component?: string;
      action?: string;
      metadata?: Record<string, any>;
    }
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        name: error instanceof Error ? error.name : 'ServiceError',
        message: error.message,
        stack: error instanceof Error ? error.stack : undefined,
        ...(('type' in error) && {
          type: (error as ServiceError).type,
          statusCode: (error as ServiceError).statusCode,
          details: (error as ServiceError).details,
        }),
      },
      context,
    };

    // Log to console in development
    if (__DEV__) {
      console.error('Error logged:', logData);
    }

    // Here you could send to analytics service like Sentry, Crashlytics, etc.
    // Example:
    // Sentry.captureException(error, { extra: logData });
  }

  /**
   * Handle upload errors specifically
   */
  static handleUploadError(
    error: Error | ServiceError,
    onRetry?: () => void
  ): void {
    const isServiceError = 'type' in error;
    const errorType = isServiceError ? (error as ServiceError).type : 'UNKNOWN_ERROR';

    // Log the error
    this.logError(error, {
      component: 'UploadComponent',
      action: 'uploadImage',
    });

    // Special handling for upload errors
    let title = 'Upload Failed';
    let showRetry = true;

    if (errorType === 'VALIDATION_ERROR') {
      // Don't show retry for validation errors
      showRetry = false;
      title = 'Invalid File';
    } else if (errorType === 'AUTHENTICATION_ERROR') {
      title = 'Authentication Required';
      showRetry = false;
    }

    this.showError(error, {
      title,
      showRetry: showRetry && !!onRetry,
      onRetry,
    });
  }

  /**
   * Handle camera errors specifically
   */
  static handleCameraError(error: Error): void {
    this.logError(error, {
      component: 'CameraComponent',
      action: 'capturePhoto',
    });

    let message: string = ERROR_MESSAGES.CAMERA.CAPTURE_FAILED;

    if (error.message.includes('permission')) {
      message = ERROR_MESSAGES.CAMERA.PERMISSION_DENIED;
    }

    this.showError(message, {
      title: 'Camera Error',
    });
  }

  /**
   * Create a wrapped async function with automatic error handling
   */
  static withErrorHandling<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      component?: string;
      action?: string;
      showUserError?: boolean;
      onError?: (error: Error | ServiceError) => void;
    } = {}
  ) {
    return async (...args: T): Promise<R | undefined> => {
      const {
        component,
        action,
        showUserError = true,
        onError,
      } = options;

      try {
        return await fn(...args);
      } catch (error) {
        const errorObj = error as Error | ServiceError;

        // Log the error
        this.logError(errorObj, {
          component,
          action,
        });

        // Call custom error handler if provided
        onError?.(errorObj);

        // Show user error if requested
        if (showUserError) {
          this.showError(errorObj);
        }

        return undefined;
      }
    };
  }
}

// Utility function for async operations with loading state
export const withLoading = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  setLoading: (loading: boolean) => void
) => {
  return async (...args: T): Promise<R | undefined> => {
    setLoading(true);
    try {
      return await fn(...args);
    } finally {
      setLoading(false);
    }
  };
};

// Debounce utility for preventing rapid successive calls
export const debounce = <T extends any[]>(
  fn: (...args: T) => void,
  delay: number
) => {
  let timeoutId: any;
  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};