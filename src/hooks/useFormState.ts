import { useState, useCallback } from 'react';

interface FormState {
  error: string;
  success: string;
  isSubmitting: boolean;
}

interface FormStateActions {
  setError: (message: string) => void;
  setSuccess: (message: string) => void;
  setIsSubmitting: (isSubmitting: boolean) => void;
  clearMessages: () => void;
  reset: () => void;
}

type UseFormStateReturn = [FormState, FormStateActions];

/**
 * Custom hook to manage form state including error/success messages and submission status.
 * Eliminates duplicate state management across multiple forms.
 */
export function useFormState(): UseFormStateReturn {
  const [error, setErrorState] = useState<string>('');
  const [success, setSuccessState] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const setError = useCallback((message: string) => {
    setErrorState(message);
    setSuccessState('');
  }, []);

  const setSuccess = useCallback((message: string) => {
    setSuccessState(message);
    setErrorState('');
  }, []);

  const clearMessages = useCallback(() => {
    setErrorState('');
    setSuccessState('');
  }, []);

  const reset = useCallback(() => {
    setErrorState('');
    setSuccessState('');
    setIsSubmitting(false);
  }, []);

  const state: FormState = {
    error,
    success,
    isSubmitting,
  };

  const actions: FormStateActions = {
    setError,
    setSuccess,
    setIsSubmitting,
    clearMessages,
    reset,
  };

  return [state, actions];
}
