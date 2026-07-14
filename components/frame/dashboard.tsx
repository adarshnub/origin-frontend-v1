"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type { Project, Workspace } from "@/lib/types";
import { CreateProjectDialog } from "./create-project-dialog";
import { ProjectCard } from "./project-card";

export function Dashboard() {
  const client=useQueryClient();const [search,setSearch]=useState("");
  const workspaces=useQuery({queryKey:["workspaces"],queryFn:()=>api<Workspace[]>("/workspaces")});
  const projects=useQuery({queryKey:["projects"],queryFn:()=>api<Project[]>("/projects")});
  const filtered=useMemo(()=>projects.data?.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()))??[],[projects.data,search]);
  function created(project:Project){client.setQueryData<Project[]>(["projects"],old=>[project,...(old??[])]);}
  return <main className="frame-dashboard"><header className="frame-page-header"><div><p className="eyebrow">Origin Frame</p><h1>Your scenes begin here.</h1></div><CreateProjectDialog workspaces={workspaces.data??[]} onCreated={created}/></header><section className="frame-dashboard__toolbar"><label className="frame-search"><Search size={16}/><span className="sr-only">Search projects</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search projects"/></label><span>{filtered.length} project{filtered.length===1?"":"s"}</span></section>{projects.isLoading?<section className="project-grid" aria-label="Loading projects">{[1,2,3].map(v=><div className="project-skeleton" key={v}/>)}</section>:projects.isError?<section className="empty-state"><h2>Couldn’t open the project shelf.</h2><p>Check that the Origin API is running and try again.</p></section>:filtered.length?<section className="project-grid">{filtered.map((project,index)=><ProjectCard key={project.id} project={project} index={index}/>)}</section>:<section className="empty-state"><Sparkles/><h2>The shelf is waiting.</h2><p>Create a project, then shape it one ordered scene at a time.</p><CreateProjectDialog workspaces={workspaces.data??[]} onCreated={created}/></section>}</main>;
}
