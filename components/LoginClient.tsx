"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export function LoginClient() {
  const router = useRouter();

  return (
    <AuthForm
      title="ログイン"
      submitLabel="ログイン"
      onSubmit={async (email, password) => {
        await loginAction(email, password);
        router.push("/play");
        router.refresh();
      }}
      footer={
        <p className="text-center text-muted">
          <Link href="/signup" className="text-link">
            サインアップ
          </Link>
          {" / "}
          <Link href="/play" className="text-link">
            れんしゅうへ
          </Link>
        </p>
      }
    />
  );
}
