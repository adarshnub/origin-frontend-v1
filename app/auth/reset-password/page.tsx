"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { api, jsonBody } from "@/lib/api";
function ResetForm(){const token=useSearchParams().get("token");const [done,setDone]=useState(false);async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);await api("/auth/reset-password",{method:"POST",body:jsonBody({token,password:data.get("password")})});setDone(true);}return done?<div className="auth-form"><h1>Password updated.</h1><Link className="origin-button" href="/auth/login">Sign in</Link></div>:<form className="auth-form" onSubmit={submit}><p className="eyebrow">Choose a new key</p><h1>New password.</h1><div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={12} required /></div><button className="origin-button" disabled={!token}>Update password</button></form>}
export default function ResetPage(){return <AuthShell><Suspense><ResetForm /></Suspense></AuthShell>}
