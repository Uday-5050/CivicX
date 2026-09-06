import React from 'react';
import { ISSUE_STATUS_LABELS, type IssueStatus } from '../../constants/status';
import './StatusPill.css';

interface StatusPillProps {
  status: IssueStatus | 'healthy' | 'degraded' | 'unhealthy' | string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusPill: React.FC<StatusPillProps> = ({ status, label, size = 'md' }) => {
  const displayLabel = label || (ISSUE_STATUS_LABELS[status as IssueStatus] ?? status);
  const normalizedClass = status.toLowerCase().replace(/_/g, '-');

  return (
    <span
      className={`status-pill status-pill--${normalizedClass} status-pill--${size}`}
      role="status"
      aria-label={`Status: ${displayLabel}`}
    >
      <span className="status-pill__dot" aria-hidden="true" />
      <span className="status-pill__label">{displayLabel}</span>
    </span>
  );
};
