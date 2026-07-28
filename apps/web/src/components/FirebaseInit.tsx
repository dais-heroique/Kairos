"use client";

import { useEffect } from "react";
import { initClientAppCheck } from "@/lib/firebase/app-check";

export function FirebaseInit() {
  useEffect(() => {
    initClientAppCheck();
  }, []);

  return null;
}
