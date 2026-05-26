"use client";

export function SessionRecoveryLoading() {
  return (
    <div
      className="app-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="app-loading-overlay__spinner" aria-hidden="true" />
      <p className="app-loading-overlay__label">読み込み中...</p>
    </div>
  );
}
