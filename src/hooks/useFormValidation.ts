import { useState, useCallback } from "react";
import { z } from "zod";
import { validateField, getErrorMessage } from "@/lib/validation";

interface UseFormValidationOptions<T> {
  schema: z.ZodObject<any> | z.ZodEffects<any>;
  initialValues: Partial<T>;
  onSubmit?: (data: T) => void | Promise<void>;
  validateOnChange?: boolean;
}

interface ValidationErrors {
  [key: string]: string | undefined;
}

export function useFormValidation<T extends Record<string, any>>({
  schema,
  initialValues,
  onSubmit,
  validateOnChange = true,
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<Partial<T>>(initialValues);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<keyof T, boolean>>({} as Record<keyof T, boolean>);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateField = useCallback((name: keyof T, value: any) => {
    if (!validateOnChange && !touched[name]) return;

    try {
      // Simple validation using the main schema
      const testValues = { ...values, [name]: value };
      const result = validateField(schema as any, testValues);
      
      setErrors(prev => ({
        ...prev,
        [name]: result.isValid ? undefined : result.error,
      }));

      return result.isValid;
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [name]: getErrorMessage(error),
      }));
      return false;
    }
  }, [schema, validateOnChange, touched, values]);

  const validateAll = useCallback(() => {
    const result = validateField(schema as any, values);
    
    if (!result.isValid && result.error) {
      // For complex schemas, we need to validate each field individually
      const newErrors: ValidationErrors = {};
      Object.keys(values).forEach((key) => {
        const fieldResult = validateField(key as keyof T, values[key as keyof T]);
        if (!fieldResult.isValid) {
          newErrors[key] = fieldResult.error;
        }
      });
      setErrors(newErrors);
    } else {
      setErrors({});
    }

    return result.isValid;
  }, [schema, values, validateField]);

  const handleChange = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    if (touched[name] || validateOnChange) {
      validateField(name, value);
    }
  }, [validateField, validateOnChange, touched]);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, values[name]);
  }, [validateField, values]);

  const handleSubmit = useCallback(async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    const isValid = validateAll();
    
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (onSubmit) {
        await onSubmit(values as T);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setErrors(prev => ({
        ...prev,
        _form: getErrorMessage(error),
      }));
    } finally {
      setIsSubmitting(false);
    }
  }, [validateAll, onSubmit, values]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({} as Record<keyof T, boolean>);
    setIsSubmitting(false);
  }, [initialValues]);

  const setFieldValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const setFieldError = useCallback((name: keyof T, error: string | undefined) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    setFieldError,
    clearErrors,
    validateField,
    validateAll,
  };
}

// Hook for simpler field-level validation
export function useFieldValidation<T>(schema: z.ZodSchema<T>, initialValue?: T) {
  const [value, setValue] = useState<T | undefined>(initialValue);
  const [error, setError] = useState<string | undefined>();
  const [touched, setTouched] = useState(false);

  const validate = useCallback((newValue: T) => {
    const result = validateField(schema, newValue);
    setError(result.isValid ? undefined : result.error);
    return result.isValid;
  }, [schema]);

  const onChange = useCallback((newValue: T) => {
    setValue(newValue);
    if (touched) {
      validate(newValue);
    }
  }, [validate, touched]);

  const onBlur = useCallback(() => {
    setTouched(true);
    if (value !== undefined) {
      validate(value);
    }
  }, [validate, value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(undefined);
    setTouched(false);
  }, [initialValue]);

  return {
    value,
    setValue,
    error,
    touched,
    onChange,
    onBlur,
    reset,
    validate,
  };
}
