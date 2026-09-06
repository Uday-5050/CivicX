import React from 'react';
import './States.css';

interface LoadingStateProps {
  message?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Loading content...' }) => {
  return (
    <div className="state-container" role="status" aria-busy="true">
      <div className="skeleton-loader">
        <div className="skeleton-line skeleton-line--title" />
        <div className="skeleton-line skeleton-line--full" />
        <div className="skeleton-line skeleton-line--short" />
      </div>
      <p className="state-message">{message}</p>
    </div>
  );
};
