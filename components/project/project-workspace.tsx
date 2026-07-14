"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Clapperboard, Library, MessageCircle, Play, Settings2, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { io } from "socket.io-client";
import { api, jsonBody } from "@/lib/api";
import type { Project, Scene } from "@/lib/types";
import { CreateSceneDialog } from "./create-scene-dialog";
import { Filmstrip } from "./filmstrip";
import { HistoryPanel } from "./history-panel";
import { SceneCard } from "./scene-card";
import { SceneMediaPanel } from "./scene-media-panel";
import { ShotDesignPanel } from "./shot-design-panel";

type View = "library" | "scenes" | "shot-design" | "sequence" | "settings";

const navigation = [
  { id: "library", label: "Library", icon: Library },
  { id: "scenes", label: "Scenes", icon: Clapperboard },
  { id: "shot-design", label: "Shot Design", icon: Sparkles },
  { id: "sequence", label: "Sequence", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings2 },
] as const;

export function ProjectWorkspace({ projectId }: { projectId: string }) {
  const client = useQueryClient();
  const [view,setView] = useState<View>("scenes");
  const [selectedId,setSelectedId] = useState<string | null>(null);
  const [sync,setSync] = useState("Saved");
  const [playSignal,setPlaySignal] = useState(0);
  const project = useQuery({ queryKey: ["project", projectId], queryFn: () => api<Project>(`/projects/${projectId}`) });
  const scenes = useMemo(() => project.data?.scenes ?? [], [project.data?.scenes]);
  const selected = useMemo(() => scenes.find((scene) => scene.id === selectedId) ?? scenes[0] ?? null, [scenes, selectedId]);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000", { withCredentials: true });
    socket.emit("project:join", projectId);
    socket.on("scene:created", () => client.invalidateQueries({ queryKey: ["project", projectId] }));
    socket.on("scene:reordered", () => client.invalidateQueries({ queryKey: ["project", projectId] }));
    socket.on("version:created", () => client.invalidateQueries({ queryKey: ["project", projectId] }));
    return () => { socket.disconnect(); };
  }, [client, projectId]);

  const reorder = useMutation({
    mutationFn: (ordered: Scene[]) => api(`/projects/${projectId}/sequence`, {
      method: "PUT",
      body: jsonBody({ expectedRevision: project.data?.revision ?? 0, sceneIds: ordered.map((scene) => scene.id) }),
    }),
    onMutate: async (ordered) => {
      setSync("Saving...");
      client.setQueryData<Project>(["project", projectId], (old) => old ? { ...old, scenes: ordered } : old);
    },
    onSettled: async () => {
      await client.invalidateQueries({ queryKey: ["project", projectId] });
      setSync("Saved");
    },
  });

  if (project.isLoading) return <main className="project-loading">Preparing project...</main>;
  if (project.isError || !project.data) return <main className="project-loading">This project could not be opened.</main>;

  function added(scene: Scene) {
    client.setQueryData<Project>(["project", projectId], (old) => old ? { ...old, scenes: [...(old.scenes ?? []), scene], revision: old.revision + 1 } : old);
    setSelectedId(scene.id);
  }

  function updated(scene: Scene) {
    client.setQueryData<Project>(["project", projectId], (old) => old ? {
      ...old,
      scenes: (old.scenes ?? []).map((item) => item.id === scene.id ? scene : item),
      revision: old.revision + 1,
    } : old);
    client.invalidateQueries({ queryKey: ["scene-versions", scene.id] });
    setSelectedId(scene.id);
  }

  function playScene(scene: Scene) {
    setView("scenes");
    setSelectedId(scene.id);
    setPlaySignal((value) => value + 1);
  }

  return <main className="project-workspace">
    <header className="project-topbar">
      <div>
        <Link href="/studio/frame" aria-label="Back to projects"><ArrowLeft /></Link>
        <span className="project-topbar__divider" />
        <div><strong>{project.data.name}</strong><small>{sync}</small></div>
      </div>
      <div>
        <button className="icon-button" aria-label="Collaborators"><Users /></button>
        <button className="icon-button" aria-label="Comments"><MessageCircle /></button>
        <button className="origin-button origin-button--ghost origin-button--small"><Play size={15} />Preview</button>
        <Link className="origin-button origin-button--small" href="/studio/frame/video-editor">Open editor</Link>
      </div>
    </header>
    <div className="project-body">
      <nav className="project-rail" aria-label="Project tools">
        {navigation.map(({ id, label, icon: Icon }) => <button key={id} className={view === id ? "active" : ""} onClick={() => setView(id)}><Icon /><span>{label}</span></button>)}
      </nav>
      <section className="project-stage">
        {view === "shot-design" ? <ShotDesignPanel projectId={projectId} selectedSceneId={selected?.id ?? null} onSceneUpdated={updated} /> : <>
          <header className="stage-header">
            <div><p className="eyebrow">{view}</p><h1>{view === "scenes" ? "Build in scenes." : view === "sequence" ? "Shape the cut." : view === "settings" ? "Project settings." : "Project library."}</h1></div>
            {view !== "settings" && <CreateSceneDialog projectId={projectId} onCreated={added} />}
          </header>
          {view === "scenes" && scenes.length ? <SceneMediaPanel workspaceId={project.data.workspaceId} scene={selected} playSignal={playSignal} onUpdated={updated} /> : null}
          {scenes.length ? <div className="scene-grid">{scenes.map((scene) => <SceneCard key={scene.id} scene={scene} selected={selected?.id === scene.id} onSelect={() => setSelectedId(scene.id)} onPlay={playScene} />)}</div> : <div className="stage-empty"><Sparkles /><h2>No scenes yet.</h2><p>Add a scene or begin with one of the Shot Design workflows.</p><CreateSceneDialog projectId={projectId} onCreated={added} /></div>}
        </>}
      </section>
      <HistoryPanel scene={selected} />
    </div>
    <Filmstrip scenes={scenes} selectedId={selected?.id ?? null} onSelect={setSelectedId} onReorder={(ordered) => reorder.mutate(ordered)} />
  </main>;
}
