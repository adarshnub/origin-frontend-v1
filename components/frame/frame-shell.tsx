"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CircleDollarSign, Clapperboard, FolderKanban, LogOut, Settings2 } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { useAuth } from "@/components/auth/auth-provider";

const links = [
  { href: "/studio/frame", label: "Projects", icon: FolderKanban },
  { href: "/studio/frame/video-editor", label: "Video editor", icon: Clapperboard },
  { href: "/studio/frame/costs", label: "Costs", icon: CircleDollarSign },
];

export function FrameShell({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const { user, signOut } = useAuth();
  return <div className="frame-app"><aside className="frame-sidebar"><div><Wordmark compact /><span className="frame-product">Frame</span></div><nav aria-label="Frame navigation">{links.map(({href,label,icon:Icon})=><Link key={href} href={href} className={pathname===href?"active":undefined}><Icon size={18}/><span>{label}</span></Link>)}</nav><div className="frame-sidebar__bottom"><button><Settings2 size={18}/><span>Settings</span></button><button onClick={async()=>{await signOut();router.push("/");}}><LogOut size={18}/><span>Sign out</span></button><div className="user-chip"><span>{user?.displayName.slice(0,1).toUpperCase()}</span><div><strong>{user?.displayName}</strong><small>{user?.email}</small></div></div></div></aside><div className="frame-content">{children}</div></div>;
}
