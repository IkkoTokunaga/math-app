"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { registerAndImportGuestAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";
import { clearGuestStore, exportGuestSnapshot } from "@/lib/guest-storage";
import { readGuestCelebratedLevels } from "@/lib/guest-unlock-celebration";

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
          <span className="text-sm text-muted">なまえ</span>
          <input
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            className="field-input"
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
        const celebratedLevels = {
          addition: readGuestCelebratedLevels("addition"),
          subtraction: readGuestCelebratedLevels("subtraction"),
        };
        await registerAndImportGuestAction(
          email,
          password,
          name,
          snapshot,
          celebratedLevels,
        );
        clearGuestStore();
        router.push("/play");
        router.refresh();
      }}
      footer={
        <div className="flex flex-col gap-2 text-center text-muted">
          {fromResult && (
            <p className="text-sm text-dim">
              この端末に保存されているきろくをとうろくします
            </p>
          )}
          <p>
            <Link href="/login" className="text-link">
              ログイン
            </Link>
            {" / "}
            <Link href="/play" className="text-link">
              れんしゅうへ
            </Link>
          </p>
        </div>
      }
    />
  );
}
