"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { api, jsonBody } from "@/lib/api";
import type { Project, Workspace } from "@/lib/types";

export function CreateProjectDialog({ workspaces, onCreated }: { workspaces: Workspace[]; onCreated: (project: Project) => void }) {
  const [open,setOpen]=useState(false);const [pending,setPending]=useState(false);const [error,setError]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);setError("");const data=new FormData(event.currentTarget);try{const project=await api<Project>("/projects",{method:"POST",body:jsonBody({workspaceId:data.get("workspaceId"),name:data.get("name"),description:data.get("description")})});onCreated(project);setOpen(false);}catch(caught){setError(caught instanceof Error?caught.message:"Could not create project");}finally{setPending(false);}}
  return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><button className="origin-button origin-button--small"><Plus size={16}/>New project</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content"><Dialog.Title>New project</Dialog.Title><Dialog.Description>Create an ordered scene workspace.</Dialog.Description><Dialog.Close className="dialog-close" aria-label="Close"><X size={18}/></Dialog.Close><form onSubmit={submit}>{error&&<p className="form-error">{error}</p>}<div className="field"><label htmlFor="workspaceId">Workspace</label><select id="workspaceId" name="workspaceId" required>{workspaces.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></div><div className="field"><label htmlFor="projectName">Project name</label><input id="projectName" name="name" placeholder="Untitled film" required autoFocus/></div><div className="field"><label htmlFor="description">Creative note</label><textarea id="description" name="description" placeholder="A sentence about the world you are making."/></div><button className="origin-button" disabled={pending||!workspaces.length}>{pending?"Creating…":"Create project"}</button></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
