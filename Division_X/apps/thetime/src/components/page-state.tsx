'use client';

import React from 'react';
import {
  SkeletonDashboard,
  SkeletonTracker,
  SkeletonTimesheet,
  SkeletonReports,
  SkeletonList
} from './skeleton';

type SkeletonType = 'dashboard' | 'tracker' | 'timesheet' | 'reports' | 'list' | 'none';

interface PageStateProps {
  loading: boolean;
  error?: string;
  empty?: boolean;
  loadingText?: string;
  emptyText?: string;
  skeletonType?: SkeletonType;
  listCols?: number;
  listRows?: number;
}

export function PageState({
  loading,
  error,
  empty,
  loadingText = 'Loading...',
  emptyText = 'No data found.',
  skeletonType = 'none',
  listCols = 4,
  listRows = 4
}: PageStateProps) {
  if (loading) {
    if (skeletonType === 'dashboard') return <SkeletonDashboard />;
    if (skeletonType === 'tracker') return <SkeletonTracker />;
    if (skeletonType === 'timesheet') return <SkeletonTimesheet />;
    if (skeletonType === 'reports') return <SkeletonReports />;
    if (skeletonType === 'list') return <SkeletonList cols={listCols} rows={listRows} />;
    return <p style={{ color: 'var(--text-muted)', padding: '20px 0' }}>{loadingText}</p>;
  }
  if (error) {
    return (
      <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', padding: '16px', borderRadius: '10px', margin: '20px 0' }}>
        ⚠️ {error}
      </div>
    );
  }
  if (empty) {
    return <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>{emptyText}</div>;
  }
  return null;
}
