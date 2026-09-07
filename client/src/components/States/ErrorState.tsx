import React from 'react';
import './States.css';

interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'Failed to load information from the server.',
  code,
  onRetry,
}) => {
  return (
    <div className="state-container" role="alert">
      <div className="state-icon">⚠️</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">
        {message}
        {code && <small style={{ display: 'block', marginTop: '4px' }}>Error code: {code}</small>}
      </p>
      {onRetry && (
        <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};
