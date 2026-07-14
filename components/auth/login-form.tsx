"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { api, ApiClientError, jsonBody } from "@/lib/api";
import { useAuth } from "./auth-provider";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true);
    const values = new FormData(event.currentTarget);
    try {
      await api("/auth/login", { method: "POST", body: jsonBody({ email: values.get("email"), password: values.get("password") }) });
      await refresh(); router.replace(params.get("next")?.startsWith("/") ? params.get("next")! : "/studio/frame");
    } catch (caught) { setError(caught instanceof ApiClientError ? caught.message : "Could not sign in."); }
    finally { setPending(false); }
  }
  return <form className="auth-form" onSubmit={submit}><p className="eyebrow">Welcome back</p><h1>Enter Frame.</h1><p className="auth-form__lead">Return to your projects and scenes.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div><p><Link className="text-link" href="/auth/forgot-password">Forgot password?</Link></p><button className="origin-button" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <>Sign in <ArrowRight size={17} /></>}</button><p className="auth-form__foot">New here? <Link href="/auth/signup">Create an account</Link></p></form>;
}
