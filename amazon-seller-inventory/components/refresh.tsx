"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps the overview live while the tab is open: refresh server data every
// 20s. This is the polling stand-in that Supabase Realtime replaces —
// same screens, push instead of pull.
export function AutoRefresh({ seconds = 20 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
