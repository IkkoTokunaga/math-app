"use client";

import { useEffect, useRef } from "react";
import {
  playKeypadBackspaceSound,
  playKeypadDigitSound,
  resumeKeypadAudioContext,
} from "@/lib/keypad-sounds";

type KeypadProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  maxDigits?: number;
};

function BackspaceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="mx-auto h-9 w-9 text-chalk"
      aria-hidden
      fill="currentColor"
    >
      <path d="M22 3H7c-.69 0-1.23.35-1.59.88L0 12l5.41 8.11c.36.53.9.89 1.59.89h15c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-3 12.59L17.59 17 14 13.41 10.41 17 9 15.59 12.59 12 9 8.41 10.41 7 14 10.59 17.59 7 19 8.41 15.41 12 19 15.59z" />
    </svg>
  );
}

export function Keypad({ value, onChange, onSubmit, disabled, maxDigits = 3 }: KeypadProps) {
  const keypadRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ disabled, value, maxDigits, onChange });
  stateRef.current = { disabled, value, maxDigits, onChange };

  useEffect(() => {
    resumeKeypadAudioContext();
  }, []);

  useEffect(() => {
    const keypad = keypadRef.current;
    if (keypad == null) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.target as Element;
      const digitButton = target.closest("button.keypad-btn");
      const backspaceButton = target.closest('button[data-keypad-sound="backspace"]');

      if (!(digitButton instanceof HTMLButtonElement) || digitButton.disabled) {
        if (!(backspaceButton instanceof HTMLButtonElement) || backspaceButton.disabled) {
          return;
        }
      }

      const { disabled: isDisabled, value: currentValue, maxDigits: limit, onChange: applyChange } =
        stateRef.current;

      if (backspaceButton instanceof HTMLButtonElement && !backspaceButton.disabled) {
        event.preventDefault();
        if (isDisabled || currentValue.length === 0) {
          return;
        }
        applyChange(currentValue.slice(0, -1));
        return;
      }

      if (!(digitButton instanceof HTMLButtonElement) || digitButton.disabled) {
        return;
      }

      const digit = digitButton.textContent?.trim();
      if (digit == null || !/^[0-9]$/.test(digit)) {
        return;
      }

      event.preventDefault();
      if (isDisabled || currentValue.length >= limit) {
        return;
      }

      applyChange(currentValue + digit);
    };

    keypad.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => {
      keypad.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) {
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        resumeKeypadAudioContext();
        playKeypadDigitSound();
        if (value.length < maxDigits) {
          onChange(value + event.key);
        }
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        if (value.length === 0) {
          return;
        }
        resumeKeypadAudioContext();
        playKeypadBackspaceSound();
        onChange(value.slice(0, -1));
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (value.length > 0) {
          onSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, value, onChange, onSubmit, maxDigits]);

  // テンキー（電卓）と同じ配列: 7-8-9 / 4-5-6 / 1-2-3
  const digits = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

  return (
    <div ref={keypadRef} className="keypad-grid mx-auto grid w-full max-w-sm grid-cols-3">
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          disabled={disabled}
          className="keypad-btn"
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled || value.length === 0}
        data-keypad-sound="backspace"
        className="keypad-btn flex items-center justify-center"
        aria-label="1文字削除"
        title="1文字削除（Backspace / Delete）"
      >
        <BackspaceIcon />
      </button>
      <button
        type="button"
        disabled={disabled}
        className="keypad-btn"
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled || value.length === 0}
        onClick={onSubmit}
        className="keypad-btn-submit"
        title="答える（Enter）"
      >
        答える
      </button>
    </div>
  );
}
