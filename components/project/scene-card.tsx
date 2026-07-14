import { Clock3, FileText, ImageIcon, MoreHorizontal, Music2, Play, Video } from "lucide-react";
import type { Scene } from "@/lib/types";

export function SceneCard({ scene, selected, onSelect }: { scene: Scene; selected: boolean; onSelect: () => void }) {
  const playback=scene.playback;
  const label=scene.currentVersion?.status==="ready" ? scene.currentVersion.kind : "Draft scene";
  return <button className={`scene-card ${selected?"selected":""}`} onClick={onSelect}><div className="scene-card__visual">
    {playback?.kind==="image"&&playback.url?
      // eslint-disable-next-line @next/next/no-img-element
      <img src={playback.url} alt=""/>:null}
    {playback?.kind==="video"&&playback.url?<video src={playback.url} muted playsInline/>:null}
    {playback?.kind==="audio"?<Music2/>:null}
    {playback?.kind==="document"?<FileText/>:null}
    {!playback ? <ImageIcon/> : null}
    {playback?.kind==="video"?<span className="scene-card__media"><Video size={12}/>Video</span>:null}
    <span className="scene-card__duration"><Clock3 size={12}/>{(scene.durationMs/1000).toFixed(0)}s</span><span className="scene-card__play"><Play size={16} fill="currentColor"/></span></div><div className="scene-card__copy"><span><strong>{scene.title}</strong><small>{label}</small></span><MoreHorizontal/></div></button>;
}
