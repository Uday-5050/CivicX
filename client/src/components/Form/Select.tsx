import React from 'react';
import './Form.css';

interface Option {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: Option[];
  error?: string;
  hint?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  options,
  error,
  hint,
  required,
  className = '',
  ...props
}) => {
  const selectId = id || props.name;

  return (
    <div className="form-group">
      {label && (
        <label htmlFor={selectId} className="form-label">
          {label}
          {required && <span className="form-required" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
        className={`form-select ${error ? 'form-select--error' : ''} ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span id={`${selectId}-error`} className="form-error" role="alert">{error}</span>}
      {hint && !error && <span id={`${selectId}-hint`} className="form-hint">{hint}</span>}
    </div>
  );
};
