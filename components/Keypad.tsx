"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

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

function handleKeypadPress(event: PointerEvent<HTMLButtonElement>, action: () => void) {
  if (event.currentTarget.disabled) {
    return;
  }
  // pointerdown で即反映し、モバイルの click 遅延・押下中の位置ズレを避ける
  event.preventDefault();
  action();
}

export function Keypad({ value, onChange, onSubmit, disabled, maxDigits = 3 }: KeypadProps) {
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const appendDigit = useCallback(
    (digit: string) => {
      if (disabled) {
        return;
      }
      const current = valueRef.current;
      if (current.length >= maxDigits) {
        return;
      }
      const next = current + digit;
      valueRef.current = next;
      onChange(next);
    },
    [disabled, maxDigits, onChange],
  );

  const backspace = useCallback(() => {
    if (disabled) {
      return;
    }
    const next = valueRef.current.slice(0, -1);
    valueRef.current = next;
    onChange(next);
  }, [disabled, onChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (disabled) {
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        appendDigit(event.key);
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        backspace();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        if (valueRef.current.length > 0) {
          onSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [disabled, appendDigit, backspace, onSubmit]);

  // テンキー（電卓）と同じ配列: 7-8-9 / 4-5-6 / 1-2-3
  const digits = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

  return (
    <div className="mx-auto grid w-full max-w-sm grid-cols-3 gap-3">
      {digits.map((digit) => (
        <button
          key={digit}
          type="button"
          disabled={disabled}
          onPointerDown={(event) => handleKeypadPress(event, () => appendDigit(digit))}
          onClick={() => appendDigit(digit)}
          className="keypad-btn"
        >
          {digit}
        </button>
      ))}
      <button
        type="button"
        disabled={disabled || value.length === 0}
        onPointerDown={(event) => handleKeypadPress(event, backspace)}
        onClick={backspace}
        className="keypad-btn flex items-center justify-center"
        aria-label="1文字削除"
        title="1文字削除（Backspace / Delete）"
      >
        <BackspaceIcon />
      </button>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(event) => handleKeypadPress(event, () => appendDigit("0"))}
        onClick={() => appendDigit("0")}
        className="keypad-btn"
      >
        0
      </button>
      <button
        type="button"
        disabled={disabled || value.length === 0}
        onPointerDown={(event) => handleKeypadPress(event, onSubmit)}
        onClick={onSubmit}
        className="keypad-btn-submit"
        title="答える（Enter）"
      >
        答える
      </button>
    </div>
  );
}
