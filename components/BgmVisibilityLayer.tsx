"use client";

import { useEffect } from "react";
import { initBgmVisibility } from "@/lib/bgm-visibility";

export function BgmVisibilityLayer() {
  useEffect(() => initBgmVisibility(), []);
  return null;
}
