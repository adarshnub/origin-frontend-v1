"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { api, jsonBody } from "@/lib/api";
export default function ForgotPage() { const [sent,setSent]=useState(false); async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);await api("/auth/forgot-password",{method:"POST",body:jsonBody({email:data.get("email")})});setSent(true);} return <AuthShell>{sent?<div className="auth-form"><p className="eyebrow">Request received</p><h1>Check your email.</h1><p className="auth-form__lead">If the address belongs to an account, a reset link is on its way.</p><Link className="origin-button" href="/auth/login">Back to sign in</Link></div>:<form className="auth-form" onSubmit={submit}><p className="eyebrow">Account recovery</p><h1>Reset your password.</h1><p className="auth-form__lead">We’ll send a secure, short-lived link.</p><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div><button className="origin-button">Send reset link</button></form>}</AuthShell>; }
