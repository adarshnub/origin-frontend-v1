import { TimelineEditor } from "@/components/video/timeline-editor";
export default async function EditorPage({params}:{params:Promise<{videoProjectId:string}>}){const {videoProjectId}=await params;return <TimelineEditor videoProjectId={videoProjectId}/>}
