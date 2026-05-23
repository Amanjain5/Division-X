'use client';

export function PaginationBar({ page, total, pageSize, onPrev, onNext }: { page: number; total: number; pageSize: number; onPrev: () => void; onNext: () => void }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button disabled={page <= 1} onClick={onPrev}>Prev</button>
      <span>Page {page} / {totalPages}</span>
      <button disabled={page >= totalPages} onClick={onNext}>Next</button>
    </div>
  );
}
