type QuizMascotProps = {
  comment: string | null;
  onHomeClick: () => void;
};

export function QuizMascot({ comment, onHomeClick }: QuizMascotProps) {
  return (
    <div className="quiz-mascot-wrap relative shrink-0">
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
        type="button"
        onClick={onHomeClick}
        className="quiz-header-mascot rounded-md transition-opacity hover:opacity-85 active:opacity-70"
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
}
