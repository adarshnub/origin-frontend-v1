"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { FileText, ImageIcon, LoaderCircle, Music2, Upload, Video } from "lucide-react";
import { api, jsonBody } from "@/lib/api";
import type { Scene } from "@/lib/types";

type UploadedAsset = { id: string; playbackUrl: string | null };
type SceneVersionResponse = { scene: Scene };
type SceneMediaKind = "image" | "video" | "audio" | "document" | "plan";

function mediaKind(file: File): "image" | "video" | "audio" | "document" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "document";
}

function PreviewIcon({ kind }: { kind: SceneMediaKind }) {
  if (kind === "video") return <Video />;
  if (kind === "audio") return <Music2 />;
  if (kind === "document") return <FileText />;
  return <ImageIcon />;
}

export function SceneMediaPanel({
  workspaceId,
  scene,
  onUpdated,
}: {
  workspaceId: string;
  scene: Scene | null;
  onUpdated: (scene: Scene) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status,setStatus]=useState("");
  const [pending,setPending]=useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !scene) return;
    const kind = mediaKind(file);
    setPending(true);
    setStatus("Uploading");
    try {
      const signed = await api<{ path: string; signedUrl: string }>("/uploads/sign", {
        method: "POST",
        body: jsonBody({ workspaceId, projectId: scene.projectId, filename: file.name, mimeType: file.type, byteSize: file.size }),
      });
      const uploaded = await fetch(signed.signedUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!uploaded.ok) throw new Error("Upload failed");
      const asset = await api<UploadedAsset>("/uploads/confirm", {
        method: "POST",
        body: jsonBody({ path: signed.path, byteSize: file.size, mimeType: file.type, name: file.name, kind, projectId: scene.projectId }),
      });
      const version = await api<SceneVersionResponse>(`/scenes/${scene.id}/versions`, {
        method: "POST",
        body: jsonBody({
          kind,
          prompt: `Uploaded ${file.name}`,
          outputAssetIds: [asset.id],
          status: "ready",
        }),
      });
      onUpdated(version.scene);
      setStatus("Attached");
    } catch {
      setStatus("Upload failed");
    } finally {
      setPending(false);
    }
  }

  if (!scene) return null;
  const playback = scene.playback;
  const kind = playback?.kind ?? scene.currentVersion?.kind ?? "image";

  return <section className="scene-media-panel">
    <div className="scene-media-panel__preview">
      {playback?.kind === "image" && playback.url ?
        // eslint-disable-next-line @next/next/no-img-element
        <img src={playback.url} alt="" /> : null}
      {playback?.kind === "video" && playback.url ? <video src={playback.url} muted playsInline controls /> : null}
      {playback?.kind === "audio" && playback.url ? <div className="scene-audio-preview"><Music2/><audio src={playback.url} controls /></div> : null}
      {!playback?.url || playback?.kind === "document" ? <span><PreviewIcon kind={kind}/></span> : null}
    </div>
    <div className="scene-media-panel__copy">
      <p className="eyebrow">Selected scene</p>
      <h2>{scene.title}</h2>
      <p>{scene.currentVersion?.prompt || "Draft scene"}</p>
    </div>
    <div className="scene-media-panel__actions">
      <input ref={inputRef} type="file" accept="image/*,video/*,audio/*,.pdf,text/plain" onChange={upload} />
      <button className="origin-button origin-button--small" disabled={pending} onClick={()=>inputRef.current?.click()}>
        {pending ? <LoaderCircle className="spin" /> : <Upload size={15}/>}
        {pending ? status : "Upload media"}
      </button>
      {status && !pending ? <small>{status}</small> : null}
    </div>
  </section>;
}
