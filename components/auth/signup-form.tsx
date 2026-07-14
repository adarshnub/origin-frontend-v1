"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { api, ApiClientError, jsonBody } from "@/lib/api";

export function SignupForm() {
  const [error, setError] = useState(""); const [sent, setSent] = useState(false); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setPending(true); const values = new FormData(event.currentTarget);
    try { await api("/auth/signup", { method: "POST", body: jsonBody({ displayName: values.get("name"), email: values.get("email"), password: values.get("password") }) }); setSent(true); }
    catch (caught) { setError(caught instanceof ApiClientError ? caught.message : "Could not create the account."); }
    finally { setPending(false); }
  }
  if (sent) return <div className="auth-form"><p className="eyebrow">One more step</p><h1>Check your inbox.</h1><p className="auth-form__lead">Use the verification link we sent, then sign in to Origin Frame.</p><Link className="origin-button" href="/auth/login">Continue to sign in</Link></div>;
  return <form className="auth-form" onSubmit={submit}><p className="eyebrow">Begin a new project</p><h1>Create your account.</h1><p className="auth-form__lead">Your personal studio is prepared automatically.</p>{error && <p className="form-error" role="alert">{error}</p>}<div className="field"><label htmlFor="name">Name</label><input id="name" name="name" autoComplete="name" minLength={2} required /></div><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required /></div><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} required /><small>12+ characters with upper, lower and a number.</small></div><button className="origin-button" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <>Create account <ArrowRight size={17} /></>}</button><p className="auth-form__foot">Already have an account? <Link href="/auth/login">Sign in</Link></p></form>;
}
