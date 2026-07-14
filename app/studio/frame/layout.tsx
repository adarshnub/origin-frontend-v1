import type { ReactNode } from "react";
import { AuthGate } from "@/components/auth/auth-gate";
import { FrameShell } from "@/components/frame/frame-shell";
import "./frame.css";

export default function FrameLayout({ children }: { children: ReactNode }) {
  return <AuthGate><FrameShell>{children}</FrameShell></AuthGate>;
}
