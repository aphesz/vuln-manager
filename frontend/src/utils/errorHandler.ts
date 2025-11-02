import { AxiosError } from 'axios';

export interface ErrorResponse {
  message: string;
  detail?: string;
  code?: string;
  field?: string;
}

/**
 * Extract user-friendly error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  // Network errors
  if (error instanceof Error && error.message === 'Network Error') {
    return 'Unable to connect to the server. Please check your internet connection and try again.';
  }

  // Axios errors
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<ErrorResponse>;
    
    // Server returned an error response
    if (axiosError.response) {
      const { status, data } = axiosError.response;
      
      // Use backend error message if available
      if (data?.detail) {
        return data.detail;
      }
      
      if (data?.message) {
        return data.message;
      }

      // HTTP status code messages
      switch (status) {
        case 400:
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Authentication required. Please log in again.';
        case 403:
          return 'You do not have permission to perform this action.';
        case 404:
          return 'The requested resource was not found.';
        case 409:
          return 'This operation conflicts with existing data.';
        case 413:
          return 'File size too large. Maximum upload size is 10 MB.';
        case 422:
          return 'Validation error. Please check your input.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again in a few moments.';
        default:
          return `An error occurred (${status}). Please try again.`;
      }
    }
    
    // Request was made but no response received (timeout, network error)
    if (axiosError.request) {
      if (axiosError.code === 'ECONNABORTED') {
        return 'Request timeout. The server took too long to respond.';
      }
      return 'Unable to reach the server. Please check your connection.';
    }
  }

  // Generic Error objects
  if (error instanceof Error) {
    return error.message || 'An unexpected error occurred.';
  }

  // Unknown error types
  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
};

/**
 * Check if error is an Axios error
 */
const isAxiosError = (error: unknown): error is AxiosError => {
  return (error as AxiosError).isAxiosError === true;
};

/**
 * Determine if an error is retryable
 */
export const isRetryableError = (error: unknown): boolean => {
  if (error instanceof Error && error.message === 'Network Error') {
    return true;
  }

  if (isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Retry on network errors
    if (!axiosError.response) {
      return true;
    }

    // Retry on specific status codes
    const status = axiosError.response?.status;
    return status ? [408, 429, 500, 502, 503, 504].includes(status) : false;
  }

  return false;
};

/**
 * Sleep utility for retry delays
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry a promise-based function with exponential backoff
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if error is not retryable
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't wait after the last attempt
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
};

/**
 * Validation error helpers
 */
export interface ValidationError {
  field: string;
  message: string;
}

export const getValidationErrors = (error: unknown): ValidationError[] => {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    
    if (axiosError.response?.status === 422 && axiosError.response.data) {
      const data = axiosError.response.data;
      
      // FastAPI validation errors format
      if (data.detail && Array.isArray(data.detail)) {
        return data.detail.map((err: any) => ({
          field: err.loc ? err.loc.join('.') : 'unknown',
          message: err.msg || 'Validation error',
        }));
      }
    }
  }

  return [];
};

/**
 * Format file size for error messages
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * Check if file is too large (max 10MB)
 */
export const validateFileSize = (file: File, maxSizeMB: number = 10): boolean => {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxBytes;
};

/**
 * Validate file type
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type) || 
         allowedTypes.some(type => file.name.toLowerCase().endsWith(type));
};
