"use client";

import { usePathname } from "next/navigation";
import { useClearScreenBgm } from "@/lib/use-clear-screen-bgm";

function isClearScreenPath(pathname: string): boolean {
  return pathname.startsWith("/result");
}

export function ClearScreenBgmLayer() {
  const pathname = usePathname();
  useClearScreenBgm(isClearScreenPath(pathname));
  return null;
}
