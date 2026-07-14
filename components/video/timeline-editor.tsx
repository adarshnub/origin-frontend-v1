"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Player, type PlayerRef } from "@remotion/player";
import {
  ArrowLeft,
  Captions,
  Film,
  ImageIcon,
  Music2,
  Plus,
  Redo2,
  Save,
  Scissors,
  Trash2,
  Undo2,
  Upload,
  Video,
  Volume2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api, jsonBody } from "@/lib/api";
import type { TimelineDocument, TimelineItem, VideoProject } from "@/lib/types";
import { splitTimelineItem, useTimelineStore } from "@/store/timeline-store";
import { TimelineComposition } from "./timeline-composition";

type MediaKind = "video" | "audio" | "image";
type MediaBinEntry = {
  assetId: string;
  kind: MediaKind;
  name: string;
  sourceUrl: string;
  durationMs: number;
  fps?: number;
  frameCount?: number;
};

type DragMode = "move" | "trim-start" | "trim-end";
type FramePreview = { frameIndex: number; timeMs: number; url: string };
type FrameSelection = { itemId: string; frameIndex: number; timeMs: number; absoluteMs: number; thumbnailUrl?: string };

function formatMs(value: number) {
  const seconds = Math.max(0, value) / 1000;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

function mediaKind(file: File): MediaKind {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "image";
}

function trackForKind(kind: MediaKind) {
  return kind === "audio" ? "audio-1" : "video-1";
}

function IconForKind({ kind }: { kind: TimelineItem["kind"] | MediaKind }) {
  if (kind === "video") return <Video size={15} />;
  if (kind === "audio") return <Music2 size={15} />;
  if (kind === "caption" || kind === "text") return <Captions size={15} />;
  return <ImageIcon size={15} />;
}

function normalizeFps(value: number) {
  const common = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120];
  const nearest = common.reduce((best, next) => (Math.abs(next - value) < Math.abs(best - value) ? next : best), common[0]!);
  return Math.abs(nearest - value) < 0.8 ? nearest : Math.round(value * 1000) / 1000;
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

async function readFileDurationMs(file: File, kind: MediaKind) {
  if (kind === "image") return 5000;
  const url = URL.createObjectURL(file);
  try {
    const element = globalThis.document.createElement(kind === "audio" ? "audio" : "video");
    element.preload = "metadata";
    element.src = url;
    await new Promise<void>((resolve, reject) => {
      element.onloadedmetadata = () => resolve();
      element.onerror = () => reject(new Error("Could not read media duration"));
    });
    if (!Number.isFinite(element.duration) || element.duration <= 0) return 5000;
    return Math.max(1000, Math.round(element.duration * 1000));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function detectVideoFps(video: HTMLVideoElement) {
  const requestFrame = video.requestVideoFrameCallback?.bind(video);
  if (!requestFrame) return 30;
  const times: number[] = [];
  let finished = false;

  return await new Promise<number>((resolve) => {
    const finish = () => {
      if (finished) return;
      finished = true;
      video.pause();
      const deltas = times.slice(1).map((time, index) => time - times[index]!).filter((delta) => delta > 0.001 && delta < 0.2);
      const detected = deltas.length ? 1 / median(deltas) : 30;
      resolve(normalizeFps(detected));
    };

    const frame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
      times.push(metadata.mediaTime);
      if (times.length >= 50 || metadata.mediaTime >= Math.min(video.duration, 2)) finish();
      else requestFrame(frame);
    };

    requestFrame(frame);
    video.muted = true;
    video.playsInline = true;
    video.currentTime = 0;
    void video.play().catch(() => resolve(30));
    globalThis.setTimeout(finish, 2600);
  });
}

async function generateVideoFrames(sourceUrl: string, fps: number, durationMs: number, options?: { maxFrames?: number }) {
  const maxFrames = options?.maxFrames ?? 720;
  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
  const step = Math.max(1, Math.ceil(frameCount / maxFrames));
  const video = globalThis.document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = sourceUrl;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Could not load video for frame extraction"));
  });
  const canvas = globalThis.document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 54;
  const context = canvas.getContext("2d");
  if (!context) return [];

  const previews: FramePreview[] = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += step) {
    const timeMs = Math.round((frameIndex / fps) * 1000);
    video.currentTime = Math.min(video.duration - 0.001, timeMs / 1000);
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    previews.push({ frameIndex, timeMs, url: canvas.toDataURL("image/jpeg", 0.58) });
  }
  return previews;
}

async function analyzeVideoFile(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    const video = globalThis.document.createElement("video");
    video.preload = "metadata";
    video.src = sourceUrl;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read video metadata"));
    });
    const durationMs = Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration * 1000) : 5000;
    const fps = await detectVideoFps(video);
    const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
    const previews = await generateVideoFrames(sourceUrl, fps, durationMs);
    return { durationMs, fps, frameCount, previews };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function uniqueMediaBin(timeline: TimelineDocument): MediaBinEntry[] {
  const entries = new Map<string, MediaBinEntry>();
  for (const item of timeline.items) {
    if (!item.assetId || !item.sourceUrl || (item.kind !== "video" && item.kind !== "audio" && item.kind !== "image")) continue;
    if (entries.has(item.assetId)) continue;
    entries.set(item.assetId, {
      assetId: item.assetId,
      kind: item.kind,
      name: item.name ?? item.kind,
      sourceUrl: item.sourceUrl,
      durationMs: item.durationMs,
      fps: item.fps,
      frameCount: item.frameCount,
    });
  }
  return [...entries.values()];
}

function nextTrackEnd(timeline: TimelineDocument, trackId: string) {
  return Math.max(0, ...timeline.items.filter((item) => item.trackId === trackId).map((item) => item.startMs + item.durationMs));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fitDuration(timeline: TimelineDocument) {
  const end = timeline.items.length ? Math.max(...timeline.items.map((item) => item.startMs + item.durationMs)) : 30_000;
  return { ...timeline, durationMs: end };
}

export function TimelineEditor({ videoProjectId }: { videoProjectId: string }) {
  const project = useQuery({
    queryKey: ["video-project", videoProjectId],
    queryFn: () => api<VideoProject>(`/video-projects/${videoProjectId}`),
  });
  const {
    document: timeline,
    past,
    future,
    dirty,
    load,
    update,
    markSaved,
    undo,
    redo,
  } = useTimelineStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("Saved");
  const [uploading, setUploading] = useState(false);
  const [framePreviews, setFramePreviews] = useState<Record<string, FramePreview[]>>({});
  const [selectedFrame, setSelectedFrame] = useState<FrameSelection | null>(null);
  const [framePrompt, setFramePrompt] = useState("");
  const loaded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<PlayerRef>(null);
  const generatingFrames = useRef(new Set<string>());
  const currentVersionId = project.data?.currentVersionId;
  const selectedItem = timeline.items.find((item) => item.id === selected);
  const mediaBin = useMemo(() => uniqueMediaBin(timeline), [timeline]);
  const durationInFrames = Math.max(1, Math.round((timeline.durationMs / 1000) * timeline.output.fps));

  const save = useCallback(async () => {
    setStatus("Saving...");
    try {
      await api(`/video-projects/${videoProjectId}/versions`, {
        method: "POST",
        body: jsonBody({ parentVersionId: currentVersionId ?? null, timeline }),
      });
      markSaved();
      setStatus("Saved");
    } catch {
      setStatus("Save failed");
    }
  }, [currentVersionId, markSaved, timeline, videoProjectId]);

  useEffect(() => {
    if (project.data?.timeline && !loaded.current) {
      load(fitDuration(project.data.timeline));
      loaded.current = true;
    }
  }, [load, project.data]);

  useEffect(() => {
    if (!dirty || !loaded.current) return;
    setStatus("Unsaved");
    const timer = setTimeout(() => void save(), 1800);
    return () => clearTimeout(timer);
  }, [dirty, save]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const updateFromPlayer = ({ detail }: { detail: { frame: number } }) => {
      setPlayhead(clamp(Math.round((detail.frame / timeline.output.fps) * 1000), 0, timeline.durationMs));
    };
    player.addEventListener("frameupdate", updateFromPlayer);
    player.addEventListener("seeked", updateFromPlayer);
    return () => {
      player.removeEventListener("frameupdate", updateFromPlayer);
      player.removeEventListener("seeked", updateFromPlayer);
    };
  }, [timeline.durationMs, timeline.output.fps]);

  useEffect(() => {
    for (const item of timeline.items) {
      if (item.kind !== "video" || !item.sourceUrl || !item.fps || framePreviews[item.id] || generatingFrames.current.has(item.id)) continue;
      generatingFrames.current.add(item.id);
      void generateVideoFrames(item.sourceUrl, item.fps, item.durationMs)
        .then((previews) => setFramePreviews((current) => ({ ...current, [item.id]: previews })))
        .catch(() => setFramePreviews((current) => ({ ...current, [item.id]: [] })))
        .finally(() => generatingFrames.current.delete(item.id));
    }
  }, [framePreviews, timeline.items]);

  function insertMedia(entry: MediaBinEntry, startMs = playhead) {
    const trackId = trackForKind(entry.kind);
    const item: TimelineItem = {
      id: crypto.randomUUID(),
      trackId,
      kind: entry.kind,
      name: entry.name,
      startMs: Math.max(0, startMs),
      durationMs: entry.durationMs,
      sourceStartMs: 0,
      assetId: entry.assetId,
      sourceUrl: entry.sourceUrl,
      volume: 1,
      muted: false,
      fps: entry.fps,
      frameCount: entry.frameCount,
    };
    update((current) => fitDuration({ ...current, items: [...current.items, item] }));
    setSelected(item.id);
    return item;
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !project.data) return;
    const kind = mediaKind(file);
    setUploading(true);
    setStatus(kind === "video" ? "Reading frames..." : "Uploading...");
    try {
      const videoAnalysis = kind === "video" ? await analyzeVideoFile(file) : null;
      const durationMs = videoAnalysis?.durationMs ?? await readFileDurationMs(file, kind);
      setStatus("Uploading...");
      const signed = await api<{ path: string; signedUrl: string }>("/uploads/sign", {
        method: "POST",
        body: jsonBody({
          workspaceId: project.data.workspaceId,
          projectId: project.data.sourceProjectId ?? null,
          filename: file.name,
          mimeType: file.type,
          byteSize: file.size,
        }),
      });
      const upload = await fetch(signed.signedUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!upload.ok) throw new Error("Upload failed");
      const asset = await api<{ id: string; playbackUrl: string | null }>("/uploads/confirm", {
        method: "POST",
        body: jsonBody({
          path: signed.path,
          byteSize: file.size,
          mimeType: file.type,
          name: file.name,
          kind,
          projectId: project.data.sourceProjectId ?? null,
        }),
      });
      if (!asset.playbackUrl) throw new Error("Playback URL missing");
      const trackId = trackForKind(kind);
      const item = insertMedia({
        assetId: asset.id,
        kind,
        name: file.name,
        sourceUrl: asset.playbackUrl,
        durationMs,
        fps: videoAnalysis?.fps,
        frameCount: videoAnalysis?.frameCount,
      }, nextTrackEnd(timeline, trackId));
      if (videoAnalysis?.previews.length) setFramePreviews((current) => ({ ...current, [item.id]: videoAnalysis.previews }));
      setStatus("Uploaded");
    } catch {
      setStatus("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function addCaption() {
    const item: TimelineItem = {
      id: crypto.randomUUID(),
      trackId: "captions-1",
      kind: "caption",
      name: "Caption",
      startMs: playhead,
      durationMs: 3000,
      text: "Caption text",
      volume: 1,
      muted: false,
    };
    update((current) => fitDuration({ ...current, items: [...current.items, item] }));
    setSelected(item.id);
  }

  function updateSelected(recipe: (item: TimelineItem) => TimelineItem) {
    update((current) => fitDuration({
      ...current,
      items: current.items.map((item) => (item.id === selected ? recipe(item) : item)),
    }));
  }

  function removeSelected() {
    if (!selected) return;
    update((current) => fitDuration({ ...current, items: current.items.filter((item) => item.id !== selected) }));
    setSelected(null);
    setSelectedFrame(null);
  }

  function selectFrame(item: TimelineItem, frame: FramePreview) {
    const absoluteMs = item.startMs + frame.timeMs;
    const existing = item.frameEdits?.find((edit) => edit.frameIndex === frame.frameIndex);
    setSelected(item.id);
    setSelectedFrame({ itemId: item.id, frameIndex: frame.frameIndex, timeMs: frame.timeMs, absoluteMs, thumbnailUrl: frame.url });
    setFramePrompt(existing?.prompt ?? "");
    seekToMs(absoluteMs);
  }

  function saveFrameInstruction() {
    if (!selectedFrame || !framePrompt.trim()) return;
    update((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== selectedFrame.itemId) return item;
        const frameEdits = item.frameEdits?.filter((edit) => edit.frameIndex !== selectedFrame.frameIndex) ?? [];
        return {
          ...item,
          frameEdits: [...frameEdits, {
            id: crypto.randomUUID(),
            frameIndex: selectedFrame.frameIndex,
            timeMs: selectedFrame.timeMs,
            operation: "instruction" as const,
            prompt: framePrompt.trim(),
            createdAt: new Date().toISOString(),
          }],
        };
      }),
    }));
  }

  function seekToMs(nextMs: number) {
    const clamped = clamp(nextMs, 0, timeline.durationMs);
    setPlayhead(clamped);
    playerRef.current?.seekTo(Math.round((clamped / 1000) * timeline.output.fps));
  }

  function scrubTimeline(event: PointerEvent<HTMLElement>) {
    event.preventDefault();
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const pointerId = event.pointerId;
    target.setPointerCapture(pointerId);

    const seekFromClientX = (clientX: number) => {
      seekToMs(Math.round(((clientX - rect.left) / rect.width) * timeline.durationMs));
    };

    seekFromClientX(event.clientX);

    const onMove = (moveEvent: globalThis.PointerEvent) => seekFromClientX(moveEvent.clientX);
    const onUp = () => {
      globalThis.removeEventListener("pointermove", onMove);
      globalThis.removeEventListener("pointerup", onUp);
    };

    globalThis.addEventListener("pointermove", onMove);
    globalThis.addEventListener("pointerup", onUp, { once: true });
  }

  function startClipPointer(event: PointerEvent<HTMLElement>, item: TimelineItem, mode: DragMode) {
    event.preventDefault();
    event.stopPropagation();
    const lane = event.currentTarget.closest<HTMLElement>(".timeline-row__lane");
    if (!lane) return;
    const rect = lane.getBoundingClientRect();
    const startX = event.clientX;
    const original = { startMs: item.startMs, durationMs: item.durationMs, sourceStartMs: item.sourceStartMs ?? 0 };
    const pointerId = event.pointerId;
    event.currentTarget.setPointerCapture(pointerId);

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      const deltaMs = Math.round(((moveEvent.clientX - startX) / rect.width) * timeline.durationMs);
      update((current) => fitDuration({
        ...current,
        items: current.items.map((candidate) => {
          if (candidate.id !== item.id) return candidate;
          if (mode === "move") return { ...candidate, startMs: Math.max(0, original.startMs + deltaMs) };
          if (mode === "trim-start") {
            const nextStart = Math.max(0, Math.min(original.startMs + original.durationMs - 500, original.startMs + deltaMs));
            const removed = nextStart - original.startMs;
            return {
              ...candidate,
              startMs: nextStart,
              durationMs: Math.max(500, original.durationMs - removed),
              sourceStartMs: Math.max(0, original.sourceStartMs + removed),
            };
          }
          return { ...candidate, durationMs: Math.max(500, original.durationMs + deltaMs) };
        }),
      }));
    };

    const onUp = () => {
      globalThis.removeEventListener("pointermove", onMove);
      globalThis.removeEventListener("pointerup", onUp);
    };

    globalThis.addEventListener("pointermove", onMove);
    globalThis.addEventListener("pointerup", onUp, { once: true });
  }

  const selectedFrameEdit = selectedItem?.frameEdits?.find((edit) => edit.frameIndex === selectedFrame?.frameIndex);

  if (project.isLoading) return <main className="editor-loading">Preparing timeline...</main>;
  if (!project.data) return <main className="editor-loading">This edit could not be opened.</main>;

  return <main className="timeline-editor timeline-editor--pro">
    <header className="editor-topbar editor-topbar--pro">
      <div>
        <Link href="/studio/frame/video-editor" aria-label="Back to video projects"><ArrowLeft /></Link>
        <div>
          <strong>{project.data.name}</strong>
          <small>{dirty ? "Unsaved changes" : status}</small>
        </div>
      </div>
      <div className="editor-actions">
        <button onClick={undo} disabled={!past.length} aria-label="Undo"><Undo2 />Undo</button>
        <button onClick={redo} disabled={!future.length} aria-label="Redo"><Redo2 />Redo</button>
        <button onClick={() => void save()}><Save />Save</button>
        <button className="export-button" disabled title="Export will be wired after the editor is ready"><Film />Export later</button>
      </div>
    </header>

    <section className="editor-workbench editor-workbench--pro">
      <aside className="editor-assets editor-assets--pro">
        <header>
          <div>
            <span className="tool-mark"><Film size={14} /></span>
            <strong>Media</strong>
          </div>
          <button onClick={() => inputRef.current?.click()} disabled={uploading}>
            <Upload size={14} />{uploading ? "Uploading" : "Import"}
          </button>
          <input ref={inputRef} type="file" accept="video/*,audio/*,image/*" onChange={importFile} />
        </header>
        <button className="editor-tool-card" onClick={addCaption}>
          <Captions />
          <span><strong>Caption</strong><small>Add at {formatMs(playhead)}</small></span>
          <Plus />
        </button>
        <div className="media-bin" aria-label="Imported media">
          {mediaBin.length ? mediaBin.map((entry) => <article className="media-bin-card" key={entry.assetId}>
            <span><IconForKind kind={entry.kind} /></span>
            <div>
              <strong>{entry.name}</strong>
              <small>{entry.kind} · {formatMs(entry.durationMs)}</small>
            </div>
            <button onClick={() => insertMedia(entry)} aria-label={`Add ${entry.name} at playhead`}><Plus size={14} /></button>
          </article>) : <div className="editor-assets__empty editor-assets__empty--real">
            <Upload />
            <p>No media has been imported for this edit yet.</p>
          </div>}
        </div>
      </aside>

      <section className="editor-preview editor-preview--pro">
        <div className="player-shell player-shell--pro">
          <Player
            ref={playerRef}
            component={TimelineComposition}
            inputProps={{ document: timeline }}
            durationInFrames={durationInFrames}
            compositionWidth={timeline.output.width}
            compositionHeight={timeline.output.height}
            fps={timeline.output.fps}
            controls
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        <div className="preview-meta">
          <span>{timeline.output.width} × {timeline.output.height}</span>
          <span>{timeline.output.fps} fps</span>
          <span>{formatMs(timeline.durationMs)}</span>
          <span>{timeline.items.length} item{timeline.items.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      <aside className="editor-inspector editor-inspector--pro">
        <p className="eyebrow">Inspector</p>
        {selectedItem ? <>
          <h2><IconForKind kind={selectedItem.kind} />{selectedItem.name ?? selectedItem.kind}</h2>
          <div className="field"><label>Start ms</label><input type="number" value={selectedItem.startMs} onChange={(event) => updateSelected((item) => ({ ...item, startMs: Number(event.target.value) }))} /></div>
          <div className="field"><label>Duration ms</label><input type="number" value={selectedItem.durationMs} onChange={(event) => updateSelected((item) => ({ ...item, durationMs: Math.max(500, Number(event.target.value)) }))} /></div>
          {(selectedItem.kind === "video" || selectedItem.kind === "audio") ? <>
            <div className="field"><label>Source in ms</label><input type="number" value={selectedItem.sourceStartMs ?? 0} onChange={(event) => updateSelected((item) => ({ ...item, sourceStartMs: Math.max(0, Number(event.target.value)) }))} /></div>
            <div className="field"><label>Volume</label><input type="number" min="0" max="2" step="0.1" value={selectedItem.volume ?? 1} onChange={(event) => updateSelected((item) => ({ ...item, volume: Number(event.target.value) }))} /></div>
            <label className="toggle-field"><input type="checkbox" checked={selectedItem.muted ?? false} onChange={(event) => updateSelected((item) => ({ ...item, muted: event.target.checked }))} /><Volume2 size={14} />Muted</label>
          </> : null}
          {selectedItem.kind === "video" ? <section className="frame-inspector">
            <header>
              <span>Frame mode</span>
              <small>{selectedItem.fps ? `${selectedItem.fps} fps` : "fps pending"} · {selectedItem.frameCount ?? 0} frames</small>
            </header>
            {selectedFrame?.itemId === selectedItem.id ? <>
              {selectedFrame.thumbnailUrl ?
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedFrame.thumbnailUrl} alt="" /> : null}
              <div className="frame-inspector__meta">
                <span>Frame {selectedFrame.frameIndex + 1}</span>
                <span>{formatMs(selectedFrame.timeMs)}</span>
              </div>
              <div className="field"><label>Frame edit instruction</label><textarea value={framePrompt} onChange={(event) => setFramePrompt(event.target.value)} placeholder="Describe the edit for this exact frame or keyframe." /></div>
              <button className="frame-save-button" onClick={saveFrameInstruction} disabled={!framePrompt.trim()}>{selectedFrameEdit ? "Update frame instruction" : "Save frame instruction"}</button>
            </> : <p className="inspector-empty">Click a thumbnail frame in the timeline clip to edit that exact frame.</p>}
          </section> : null}
          {(selectedItem.kind === "caption" || selectedItem.kind === "text") ? <div className="field"><label>Text</label><textarea value={selectedItem.text ?? ""} onChange={(event) => updateSelected((item) => ({ ...item, text: event.target.value }))} /></div> : null}
          <button className="danger-button" onClick={removeSelected}><Trash2 />Remove item</button>
        </> : <p className="inspector-empty">Select a timeline clip to edit timing, trim, text, or audio.</p>}
      </aside>
    </section>

    <section className="timeline timeline--pro">
      <header>
        <div>
          <button onClick={() => selected && update((current) => splitTimelineItem(current, selected, playhead))} disabled={!selected}><Scissors />Split</button>
        </div>
        <div>
          <button onClick={() => setZoom((value) => Math.max(0.6, value - 0.2))}><ZoomOut /></button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => Math.min(2.4, value + 0.2))}><ZoomIn /></button>
        </div>
      </header>
      <div className="timeline-scroll">
        <div
          className="timeline-ruler"
          style={{ width: `${zoom * 100}%` }}
          onPointerDown={scrubTimeline}
        >
          {Array.from({ length: 11 }, (_, index) => <span key={index} style={{ left: `${index * 10}%` }}>{formatMs((timeline.durationMs * index) / 10)}</span>)}
          <i style={{ left: `${timeline.durationMs ? (playhead / timeline.durationMs) * 100 : 0}%` }} />
        </div>
        {timeline.tracks.map((track) => <div className="timeline-row timeline-row--pro" key={track.id}>
          <span>{track.name}</span>
          <div className="timeline-row__lane" style={{ width: `${zoom * 100}%` }}>
            {timeline.items.filter((item) => item.trackId === track.id).map((item) => {
              const previews = framePreviews[item.id] ?? [];
              const editedFrames = new Set(item.frameEdits?.map((edit) => edit.frameIndex) ?? []);
              return <div
                key={item.id}
                className={`timeline-clip timeline-clip--${item.kind} ${selected === item.id ? "selected" : ""}`}
                style={{ left: `${(item.startMs / timeline.durationMs) * 100}%`, width: `${(item.durationMs / timeline.durationMs) * 100}%` }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelected(item.id);
                  if (selectedFrame?.itemId !== item.id) setSelectedFrame(null);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  setSelected(item.id);
                  if (selectedFrame?.itemId !== item.id) setSelectedFrame(null);
                }}
                onPointerDown={(event) => startClipPointer(event, item, "move")}
              >
                <span className="clip-handle clip-handle--left" onPointerDown={(event) => startClipPointer(event, item, "trim-start")} />
                {item.kind === "video" && previews.length ? <span className="clip-frame-strip">
                  {previews.map((frame) => <button
                    key={`${item.id}-${frame.frameIndex}`}
                    type="button"
                    className={`clip-frame ${selectedFrame?.itemId === item.id && selectedFrame.frameIndex === frame.frameIndex ? "selected" : ""} ${editedFrames.has(frame.frameIndex) ? "edited" : ""}`}
                    style={{ backgroundImage: `url(${frame.url})` }}
                    title={`Frame ${frame.frameIndex + 1} · ${formatMs(frame.timeMs)}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectFrame(item, frame);
                    }}
                  />)}
                </span> : <>
                  <IconForKind kind={item.kind} />
                  <span>{item.text || item.name || item.kind}</span>
                </>}
                <span className="clip-handle clip-handle--right" onPointerDown={(event) => startClipPointer(event, item, "trim-end")} />
              </div>;
            })}
          </div>
        </div>)}
      </div>
    </section>
  </main>;
}
