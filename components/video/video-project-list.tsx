"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Clock3, Plus, Scissors } from "lucide-react";
import { api, jsonBody } from "@/lib/api";
import type { VideoProject, Workspace } from "@/lib/types";

export function VideoProjectList() {
  const router=useRouter();const client=useQueryClient();const projects=useQuery({queryKey:["video-projects"],queryFn:()=>api<VideoProject[]>("/video-projects")});const workspaces=useQuery({queryKey:["workspaces"],queryFn:()=>api<Workspace[]>("/workspaces")});
  async function create(){const workspace=workspaces.data?.[0];if(!workspace)return;const project=await api<VideoProject>("/video-projects",{method:"POST",body:jsonBody({workspaceId:workspace.id,name:"Untitled edit"})});client.setQueryData<VideoProject[]>(["video-projects"],old=>[project,...(old??[])]);router.push(`/studio/frame/video-editor/${project.id}`);}
  return <main className="frame-dashboard video-library"><header className="frame-page-header"><div><p className="eyebrow">Timeline editor</p><h1>Make the final cut.</h1></div><button className="origin-button origin-button--small" onClick={create} disabled={!workspaces.data?.length}><Plus/>New edit</button></header>{projects.isLoading?<div className="project-grid"><div className="project-skeleton"/><div className="project-skeleton"/></div>:projects.data?.length?<section className="video-project-grid">{projects.data.map((project,index)=><Link href={`/studio/frame/video-editor/${project.id}`} className="video-project-card" key={project.id}><div><span>{String(index+1).padStart(2,"0")}</span><Scissors/></div><h2>{project.name}</h2><footer><span><Clock3/>Edited {new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(new Date(project.updatedAt))}</span><Clapperboard/></footer></Link>)}</section>:<section className="empty-state"><Clapperboard/><h2>No edits yet.</h2><p>Start an edit or send scenes here from a project.</p><button className="origin-button origin-button--small" onClick={create}>Create an edit</button></section>}</main>;
}
