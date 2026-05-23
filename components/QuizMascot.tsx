"use client";

import { forwardRef } from "react";

type QuizMascotProps = {
  comment: string | null;
  onHomeClick: () => void;
  /** タイムアタックの光玉攻撃演出用 */
  lightOrbActive?: boolean;
  /** 攻撃ゲージから光を集める演出 */
  chargeActive?: boolean;
  /** 邪気玉ヒット演出 */
  hitActive?: boolean;
  className?: string;
};

export const QuizMascot = forwardRef<HTMLButtonElement, QuizMascotProps>(
  function QuizMascot(
    {
      comment,
      onHomeClick,
      lightOrbActive = false,
      chargeActive = false,
      hitActive = false,
      className = "",
    },
    ref,
  ) {
    return (
      <div className={`quiz-mascot-wrap relative shrink-0 ${className}`.trim()}>
        {comment != null && (
          <p
            className="mascot-speech-bubble min-w-[8.5rem] w-max max-w-[14rem] whitespace-nowrap px-5 py-2"
            role="status"
            aria-live="polite"
          >
            {comment}
          </p>
        )}
        <button
          ref={ref}
          type="button"
          onClick={onHomeClick}
          className={`quiz-header-mascot rounded-md transition-opacity hover:opacity-85 active:opacity-70 ${chargeActive ? "quiz-header-mascot--charging" : ""} ${hitActive ? "quiz-header-mascot--evil-hit" : ""} ${lightOrbActive ? "quiz-header-mascot--firing" : ""}`}
          aria-label="ホームにもどる"
        >
          <img
            src="/mascot.png"
            alt=""
            width={155}
            height={312}
            className="quiz-mascot-img"
            aria-hidden
          />
        </button>
      </div>
    );
  },
);
