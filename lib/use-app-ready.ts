"use client";

import { useSyncExternalStore } from "react";
import { isAppReady, subscribeAppReady } from "@/lib/app-bootstrap";

export function useAppReady(): boolean {
  return useSyncExternalStore(
    subscribeAppReady,
    isAppReady,
    () => false,
  );
}
