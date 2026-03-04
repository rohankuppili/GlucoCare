import { useCallback } from "react";
import { toast } from "sonner";

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const handleError = useCallback(
    (error: any, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        logToConsole = true,
        fallbackMessage = "An unexpected error occurred",
      } = options;

      // Log to console if enabled
      if (logToConsole) {
        console.error("Error:", error);
      }

      // Extract error message
      let errorMessage = fallbackMessage;
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.error?.message) {
        errorMessage = error.error.message;
      }

      // Show toast notification if enabled
      if (showToast) {
        toast.error(errorMessage);
      }

      return errorMessage;
    },
    []
  );

  const handleAsyncError = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options: ErrorHandlerOptions = {}
    ): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, options);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
}
