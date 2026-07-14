import type { ReactNode } from "react";
import { Wordmark } from "@/components/brand/wordmark";

export function AuthShell({ children }: { children: ReactNode }) {
  return <main className="auth-page"><section className="auth-art" aria-hidden="true"><Wordmark /><blockquote>Make the next frame <i>inevitable.</i></blockquote><span className="eyebrow">Origin Frame</span></section><section className="auth-panel">{children}</section></main>;
}
