import { AbsoluteFill, Audio, Img, OffthreadVideo, Sequence } from "remotion";
import type { TimelineDocument, TimelineItem } from "@/lib/types";

function Visual({ item }: { item: TimelineItem }) {
  if (item.kind === "video" && item.sourceUrl) return <OffthreadVideo src={item.sourceUrl} startFrom={Math.round((item.sourceStartMs??0)/1000*30)} muted={item.muted} volume={item.volume??1}/>;
  if (item.kind === "image" && item.sourceUrl) return <Img src={item.sourceUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/>;
  if (item.kind === "caption" || item.kind === "text") return <AbsoluteFill style={{justifyContent:"flex-end",alignItems:"center",padding:"8%",fontFamily:"IBM Plex Sans",fontSize:54,fontWeight:600,textAlign:"center",textShadow:"0 3px 20px #000"}}>{item.text}</AbsoluteFill>;
  return null;
}

export function TimelineComposition({ document }: { document: TimelineDocument }) {
  const fps=document.output.fps;
  return <AbsoluteFill style={{backgroundColor:"#000",color:"#f7faff"}}>{document.items.map(item=>{const from=Math.round(item.startMs/1000*fps);const durationInFrames=Math.max(1,Math.round(item.durationMs/1000*fps));if(item.kind==="audio"&&item.sourceUrl)return <Sequence key={item.id} from={from} durationInFrames={durationInFrames}><Audio src={item.sourceUrl} startFrom={Math.round((item.sourceStartMs??0)/1000*fps)} volume={item.muted?0:item.volume??1}/></Sequence>;return <Sequence key={item.id} from={from} durationInFrames={durationInFrames}><Visual item={item}/></Sequence>;})}</AbsoluteFill>;
}
