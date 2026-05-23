'use client';

export function PageState({ loading, error, empty, loadingText = 'Loading...', emptyText = 'No data found.' }: { loading: boolean; error?: string; empty?: boolean; loadingText?: string; emptyText?: string }) {
  if (loading) return <p>{loadingText}</p>;
  if (error) return <p>{error}</p>;
  if (empty) return <p>{emptyText}</p>;
  return null;
}
