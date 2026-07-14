"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import { api, jsonBody } from "@/lib/api";
import type { Scene } from "@/lib/types";

export function CreateSceneDialog({ projectId, onCreated }: { projectId: string; onCreated: (scene: Scene) => void }) {
  const [open,setOpen]=useState(false);const [pending,setPending]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setPending(true);const data=new FormData(event.currentTarget);try{const scene=await api<Scene>(`/projects/${projectId}/scenes`,{method:"POST",body:jsonBody({title:data.get("title"),kind:data.get("kind"),prompt:data.get("prompt")})});onCreated(scene);setOpen(false);}finally{setPending(false);}}
  return <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Trigger asChild><button className="origin-button origin-button--small"><Plus size={16}/>Add scene</button></Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content"><Dialog.Title>Add a scene</Dialog.Title><Dialog.Description>Create the next ordered beat. You can generate or upload media later.</Dialog.Description><Dialog.Close className="dialog-close"><X/></Dialog.Close><form onSubmit={submit}><div className="field"><label htmlFor="sceneTitle">Scene title</label><input id="sceneTitle" name="title" required autoFocus placeholder="Night market arrival"/></div><div className="field"><label htmlFor="sceneKind">Starting format</label><select id="sceneKind" name="kind"><option value="image">Image</option><option value="video">Video</option><option value="audio">Audio</option><option value="plan">Plan</option></select></div><div className="field"><label htmlFor="scenePrompt">Prompt or note</label><textarea id="scenePrompt" name="prompt" placeholder="Describe what belongs in this scene."/></div><button className="origin-button" disabled={pending}>{pending?"Adding…":"Add to sequence"}</button></form></Dialog.Content></Dialog.Portal></Dialog.Root>;
}
