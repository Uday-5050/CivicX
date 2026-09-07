import React from 'react';
import './Form.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  error,
  hint,
  required,
  className = '',
  ...props
}) => {
  const inputId = id || props.name;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required && <span className="form-required" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`form-input ${error ? 'form-input--error' : ''} ${className}`}
        {...props}
      />
      {error && <span id={`${inputId}-error`} className="form-error" role="alert">{error}</span>}
      {hint && !error && <span id={`${inputId}-hint`} className="form-hint">{hint}</span>}
    </div>
  );
};
