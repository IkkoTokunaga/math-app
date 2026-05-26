"use client";

import { stopHomeBgm } from "@/lib/home-bgm";
import { stopQuizBgm } from "@/lib/quiz-bgm";
import { setSoundEnabled } from "@/lib/sound-settings";
import { stopTimeAttackBgm } from "@/lib/time-attack-bgm";
import { useSoundEnabled } from "@/lib/use-sound-enabled";
import { createPortal } from "react-dom";

export function SoundToggleButton() {
  const soundEnabled = useSoundEnabled();

  if (typeof document === "undefined") {
    return null;
  }

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);

    if (!next) {
      stopHomeBgm();
      stopQuizBgm();
      stopTimeAttackBgm();
    }
  };

  return createPortal(
    <div className="sound-toggle-layer">
      <button
        type="button"
        className="sound-toggle-btn"
        onClick={toggleSound}
        aria-label={soundEnabled ? "音を消す" : "音を鳴らす"}
        aria-pressed={!soundEnabled}
        title={soundEnabled ? "音を消す" : "音を鳴らす"}
      >
        <span className="sound-toggle-btn__icon" aria-hidden="true">
          {soundEnabled ? "🔊" : "🔇"}
        </span>
      </button>
    </div>,
    document.body,
  );
}
