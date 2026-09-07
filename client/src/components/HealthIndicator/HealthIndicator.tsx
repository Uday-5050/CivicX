import React, { useState } from 'react';
import { useHealthQuery } from '../../api/health.api';
import { StatusPill } from '../StatusPill/StatusPill';
import './HealthIndicator.css';

export const HealthIndicator: React.FC = () => {
  const { data, isLoading, isError, refetch } = useHealthQuery();
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <div className="health-indicator health-indicator--loading">
        <span className="health-pulse-dot health-pulse-dot--loading" />
        <span className="health-label">Checking API...</span>
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="health-indicator health-indicator--error" onClick={() => refetch()}>
        <span className="health-pulse-dot health-pulse-dot--error" />
        <span className="health-label">API Offline</span>
        <button
          type="button"
          className="health-retry-btn"
          aria-label="Retry health check"
          onClick={(e) => {
            e.stopPropagation();
            refetch();
          }}
        >
          ↻
        </button>
      </div>
    );
  }

  const health = data.data;

  return (
    <div className="health-indicator-container">
      <button
        type="button"
        className={`health-indicator health-indicator--${health.status}`}
        onClick={() => setShowDetails(!showDetails)}
        aria-expanded={showDetails}
        aria-label={`API Health: ${health.status}. Click for details.`}
      >
        <span className={`health-pulse-dot health-pulse-dot--${health.status}`} />
        <span className="health-label">
          {health.status === 'healthy' ? 'API 200 OK' : `API: ${health.status}`}
        </span>
      </button>

      {showDetails && (
        <div className="health-popover" role="region" aria-label="System Health Details">
          <div className="health-popover__header">
            <h4>Backend System Health</h4>
            <StatusPill status={health.status} size="sm" />
          </div>

          <dl className="health-popover__list">
            <div className="health-row">
              <dt>Status:</dt>
              <dd><strong>{health.status.toUpperCase()}</strong></dd>
            </div>
            <div className="health-row">
              <dt>Environment:</dt>
              <dd>{health.environment}</dd>
            </div>
            <div className="health-row">
              <dt>Uptime:</dt>
              <dd>{Math.round(health.uptime)}s</dd>
            </div>
            {health.mongo && (
              <div className="health-row">
                <dt>Database:</dt>
                <dd className={health.mongo === 'connected' ? 'text-success' : 'text-danger'}>
                  MongoDB {health.mongo}
                </dd>
              </div>
            )}
            {data.meta?.requestId && (
              <div className="health-row">
                <dt>Correlation ID:</dt>
                <dd className="mono-text">{data.meta.requestId.substring(0, 18)}...</dd>
              </div>
            )}
          </dl>

          <div className="health-popover__footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => refetch()}
            >
              ↻ Refresh Health
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
