"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { registerAndImportGuestAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { clearGuestStore, exportGuestSnapshot } from "@/lib/guest-storage";

export function SignupClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromResult = searchParams.get("from") === "result";
  const [childName, setChildName] = useState("");

  return (
    <AuthForm
      title="サインアップ"
      submitLabel="登録する"
      extraFields={
        <label className="flex flex-col gap-1 text-left">
          <span className="text-sm text-slate-600">なまえ</span>
          <input
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            className="rounded-2xl border-2 border-slate-200 px-4 py-3 text-lg"
            maxLength={50}
            placeholder="なまえ"
          />
        </label>
      }
      onSubmit={async (email, password) => {
        const name = childName.trim();
        if (!name) {
          throw new Error("名前を入力してください");
        }
        const snapshot = exportGuestSnapshot();
        await registerAndImportGuestAction(email, password, name, snapshot);
        clearGuestStore();
        router.push("/play");
        router.refresh();
      }}
      footer={
        <div className="flex flex-col gap-2 text-center text-slate-600">
          {fromResult && (
            <p className="text-sm text-slate-500">
              この端末に保存されているきろくをとうろくします
            </p>
          )}
          <p>
            <Link href="/login" className="text-sky-600 underline">
              ログイン
            </Link>
            {" / "}
            <Link href="/play" className="text-sky-600 underline">
              れんしゅうへ
            </Link>
          </p>
        </div>
      }
    />
  );
}
