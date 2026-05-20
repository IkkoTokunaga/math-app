"use client";

import { useState } from "react";

type AuthFormProps = {
  title: string;
  submitLabel: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  extraFields?: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthForm({
  title,
  submitLabel,
  onSubmit,
  extraFields,
  footer,
}: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card mx-auto max-w-md">
      <h1 className="mb-6 text-center text-3xl font-bold text-slate-800">{title}</h1>
      <div className="flex flex-col gap-4">
        {extraFields}
        <label className="flex flex-col gap-1 text-left">
          <span className="text-sm text-slate-600">メール</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg"
            autoComplete="email"
          />
        </label>
        <label className="flex flex-col gap-1 text-left">
          <span className="text-sm text-slate-600">パスワード</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg"
            autoComplete={submitLabel === "ログイン" ? "current-password" : "new-password"}
          />
        </label>
        {error && <p className="feedback-error">{error}</p>}
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="big-btn bg-sky-500 text-white"
        >
          {submitting ? "処理中..." : submitLabel}
        </button>
        {footer}
      </div>
    </section>
  );
}
