import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence } from "remotion";
import type { CSSProperties } from "react";
import type { TimelineDocument, TimelineItem, TimelineTrack } from "@/lib/types";

function transformStyle(item: TimelineItem): CSSProperties {
  const transform = item.transform;
  if (!transform) return {};
  return {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale}) rotate(${transform.rotation}deg)`,
    transformOrigin: "center",
  };
}

function trackMuted(item: TimelineItem, tracks: TimelineTrack[]) {
  return Boolean(item.muted || tracks.find((track) => track.id === item.trackId)?.muted);
}

function Visual({ item, fps, tracks }: { item: TimelineItem; fps: number; tracks: TimelineTrack[] }) {
  const startFrom = Math.round(((item.sourceStartMs ?? 0) / 1000) * fps);
  const commonStyle: CSSProperties = { width: "100%", height: "100%", objectFit: "cover", ...transformStyle(item) };

  if (item.kind === "video" && item.sourceUrl) {
    return <OffthreadVideo src={item.sourceUrl} startFrom={startFrom} muted={trackMuted(item, tracks)} volume={item.volume ?? 1} style={commonStyle} />;
  }

  if (item.kind === "image" && item.sourceUrl) {
    return <Img src={item.sourceUrl} style={commonStyle} />;
  }

  if (item.kind === "caption" || item.kind === "text") {
    return <AbsoluteFill style={{
      justifyContent: "flex-end",
      alignItems: "center",
      padding: "8%",
      fontFamily: "IBM Plex Sans, sans-serif",
      fontSize: 54,
      fontWeight: 700,
      lineHeight: 1.05,
      textAlign: "center",
      color: "#f7faff",
      textShadow: "0 4px 24px rgba(0,0,0,.85)",
      ...transformStyle(item),
    }}>{item.text}</AbsoluteFill>;
  }

  return null;
}

export function TimelineComposition({ document }: { document: TimelineDocument }) {
  const fps = document.output.fps;
  return <AbsoluteFill style={{ backgroundColor: "#000", color: "#f7faff" }}>
    {document.items.map((item) => {
      const from = Math.round((item.startMs / 1000) * fps);
      const durationInFrames = Math.max(1, Math.round((item.durationMs / 1000) * fps));
      const startFrom = Math.round(((item.sourceStartMs ?? 0) / 1000) * fps);

      if (item.kind === "audio" && item.sourceUrl) {
        return <Sequence key={item.id} from={from} durationInFrames={durationInFrames}>
          <Audio src={item.sourceUrl} startFrom={startFrom} volume={trackMuted(item, document.tracks) ? 0 : item.volume ?? 1} />
        </Sequence>;
      }

      return <Sequence key={item.id} from={from} durationInFrames={durationInFrames}>
        <Visual item={item} fps={fps} tracks={document.tracks} />
      </Sequence>;
    })}
  </AbsoluteFill>;
}
