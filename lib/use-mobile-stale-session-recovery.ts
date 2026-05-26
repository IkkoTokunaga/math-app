"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { validatePlaySessionAction } from "@/app/actions/session";
import { validateTimeAttackSessionAction } from "@/app/actions/time-attack";
import { isGuestStandardSessionActive } from "@/lib/guest-session";
import { isGuestTimeAttackSessionActive } from "@/lib/guest-time-attack";
import { isMobileViewport } from "@/lib/bgm-volume";
import type { Operation } from "@/lib/operations";
import { isSessionNotFoundError } from "@/lib/session-errors";

const REDIRECT_LOADING_MS = 700;

export type PlaySessionMode = "standard" | "time_attack";

type UseMobileStaleSessionRecoveryOptions = {
  sessionId: string | null;
  homeHref: string;
  isGuest: boolean;
  mode: PlaySessionMode;
  operation?: Operation;
  onBeforeRedirect?: () => void;
};

async function isMemberSessionActive(
  sessionId: string,
  mode: PlaySessionMode,
): Promise<boolean> {
  const result =
    mode === "time_attack"
      ? await validateTimeAttackSessionAction(sessionId)
      : await validatePlaySessionAction(sessionId);
  return result.valid;
}

function isGuestSessionActive(
  sessionId: string,
  mode: PlaySessionMode,
  operation: Operation,
): boolean {
  return mode === "time_attack"
    ? isGuestTimeAttackSessionActive(sessionId, operation)
    : isGuestStandardSessionActive(sessionId);
}

export function useMobileStaleSessionRecovery({
  sessionId,
  homeHref,
  isGuest,
  mode,
  operation,
  onBeforeRedirect,
}: UseMobileStaleSessionRecoveryOptions) {
  const router = useRouter();
  const [recoveringHome, setRecoveringHome] = useState(false);
  const wasHiddenRef = useRef(false);
  const redirectingRef = useRef(false);
  const onBeforeRedirectRef = useRef(onBeforeRedirect);

  useEffect(() => {
    onBeforeRedirectRef.current = onBeforeRedirect;
  }, [onBeforeRedirect]);

  const redirectHome = useCallback(() => {
    if (redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;
    setRecoveringHome(true);
    onBeforeRedirectRef.current?.();

    window.setTimeout(() => {
      router.replace(homeHref);
    }, REDIRECT_LOADING_MS);
  }, [homeHref, router]);

  const checkSessionStillActive = useCallback(async () => {
    if (!sessionId || !isMobileViewport()) {
      return true;
    }

    try {
      if (isGuest) {
        if (!operation) {
          return false;
        }
        return isGuestSessionActive(sessionId, mode, operation);
      }

      return await isMemberSessionActive(sessionId, mode);
    } catch {
      return false;
    }
  }, [sessionId, isGuest, mode, operation]);

  const handleSessionError = useCallback(
    (error: unknown) => {
      if (!isMobileViewport() || !isSessionNotFoundError(error)) {
        return false;
      }

      redirectHome();
      return true;
    },
    [redirectHome],
  );

  useEffect(() => {
    if (!sessionId || !isMobileViewport()) {
      return;
    }

    const handleReturn = () => {
      if (document.hidden) {
        wasHiddenRef.current = true;
        return;
      }

      if (!wasHiddenRef.current) {
        return;
      }

      void checkSessionStillActive().then((active) => {
        if (!active) {
          redirectHome();
        }
      });
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) {
        return;
      }

      void checkSessionStillActive().then((active) => {
        if (!active) {
          redirectHome();
        }
      });
    };

    document.addEventListener("visibilitychange", handleReturn);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("visibilitychange", handleReturn);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [sessionId, checkSessionStillActive, redirectHome]);

  return { recoveringHome, handleSessionError, redirectHome };
}
