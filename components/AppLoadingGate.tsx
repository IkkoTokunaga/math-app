"use client";

import { useEffect } from "react";
import { bootstrapApp } from "@/lib/app-bootstrap";
import { useAppReady } from "@/lib/use-app-ready";

type AppLoadingGateProps = {
  children: React.ReactNode;
};

export function AppLoadingGate({ children }: AppLoadingGateProps) {
  const ready = useAppReady();

  useEffect(() => {
    void bootstrapApp();
  }, []);

  useEffect(() => {
    if (ready) {
      document.documentElement.classList.remove("app-loading");
      return;
    }

    document.documentElement.classList.add("app-loading");
    return () => {
      document.documentElement.classList.remove("app-loading");
    };
  }, [ready]);

  return (
    <>
      {children}
      {!ready && (
        <div
          className="app-loading-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <span className="app-loading-overlay__spinner" aria-hidden="true" />
          <p className="app-loading-overlay__label">読み込み中...</p>
        </div>
      )}
    </>
  );
}
