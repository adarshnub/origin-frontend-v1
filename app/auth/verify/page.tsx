"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { api, jsonBody } from "@/lib/api";
function VerifyResult(){const token=useSearchParams().get("token");const [state,setState]=useState(token?"Verifying your email…":"This verification link is incomplete.");useEffect(()=>{if(!token)return;api("/auth/verify-email",{method:"POST",body:jsonBody({token})}).then(()=>setState("Your email is verified.")).catch(()=>setState("This verification link is invalid or expired."));},[token]);return <div className="auth-form"><p className="eyebrow">Account verification</p><h1>{state}</h1><Link className="origin-button" href="/auth/login">Continue</Link></div>}
export default function VerifyPage(){return <AuthShell><Suspense fallback={<div className="auth-form"><p className="eyebrow">Account verification</p><h1>Verifying your email…</h1></div>}><VerifyResult /></Suspense></AuthShell>}
