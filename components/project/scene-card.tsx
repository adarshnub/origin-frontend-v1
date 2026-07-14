import { Clock3, FileText, ImageIcon, MoreHorizontal, Music2, Play, Video } from "lucide-react";
import type { Scene } from "@/lib/types";

export function SceneCard({
  scene,
  selected,
  onSelect,
  onPlay,
}: {
  scene: Scene;
  selected: boolean;
  onSelect: () => void;
  onPlay?: (scene: Scene) => void;
}) {
  const playback = scene.playback;
  const isVideo = playback?.kind === "video" && Boolean(playback.url);
  const label = scene.currentVersion?.status === "ready" ? scene.currentVersion.kind : "Draft scene";

  return <article className={`scene-card ${selected ? "selected" : ""}`}>
    <button className="scene-card__select" onClick={onSelect} aria-label={`Select ${scene.title}`}>
      <div className="scene-card__visual">
        {playback?.kind === "image" && playback.url ?
          // eslint-disable-next-line @next/next/no-img-element
          <img src={playback.url} alt="" /> : null}
        {isVideo ? <video src={playback!.url!} muted playsInline preload="metadata" /> : null}
        {playback?.kind === "audio" ? <Music2 /> : null}
        {playback?.kind === "document" ? <FileText /> : null}
        {!playback ? <ImageIcon /> : null}
        {isVideo ? <span className="scene-card__media"><Video size={12} />Video</span> : null}
        <span className="scene-card__duration"><Clock3 size={12} />{(scene.durationMs / 1000).toFixed(0)}s</span>
      </div>
      <div className="scene-card__copy"><span><strong>{scene.title}</strong><small>{label}</small></span><MoreHorizontal /></div>
    </button>
    {isVideo ? <button className="scene-card__play" onClick={() => onPlay?.(scene)} aria-label={`Play ${scene.title}`}>
      <Play size={16} fill="currentColor" />
    </button> : null}
  </article>;
}
