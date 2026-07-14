"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, GitBranch, History, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { Scene, SceneVersion } from "@/lib/types";

export function HistoryPanel({ scene }: { scene: Scene | null }) {
  const versions=useQuery({queryKey:["scene-versions",scene?.id],queryFn:()=>api<SceneVersion[]>(`/scenes/${scene!.id}/versions`),enabled:Boolean(scene)});
  useEffect(()=>{function keys(event:KeyboardEvent){if(!versions.data?.length)return;if(event.key==="ArrowUp"||event.key==="ArrowDown")event.preventDefault();}window.addEventListener("keydown",keys);return()=>window.removeEventListener("keydown",keys);},[versions.data]);
  return <aside className="history-panel"><header><span><History size={17}/>History</span>{scene&&<small>{scene.title}</small>}</header>{!scene?<div className="history-empty"><GitBranch/><p>Select a scene to inspect its lineage.</p></div>:versions.isLoading?<div className="history-empty"><LoaderCircle className="spin"/></div>:versions.data?.length?<ol>{versions.data.map((version,index)=><li key={version.id} className={version.id===scene.currentVersionId?"current":""}><div className="history-node">{version.id===scene.currentVersionId?<Check/>:<span/>}</div><article><header><strong>Version {versions.data!.length-index}</strong><time>{new Intl.DateTimeFormat("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(version.createdAt))}</time></header><p>{version.prompt||"Initial scene state"}</p><footer><span>{version.kind}</span><span>{version.status}</span></footer></article></li>)}</ol>:<div className="history-empty"><p>No versions yet.</p></div>}</aside>;
}
