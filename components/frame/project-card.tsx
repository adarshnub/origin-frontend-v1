import Link from "next/link";
import { ArrowUpRight, Clock3, Layers3 } from "lucide-react";
import type { Project } from "@/lib/types";

export function ProjectCard({ project, index }: { project: Project; index: number }) {
  const date = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(project.updatedAt));
  return <Link className="frame-project-card" href={`/studio/frame/projects/${project.id}`}><div className="frame-project-card__image"><span>{String(index+1).padStart(2,"0")}</span><div className="frame-project-card__aperture"/><ArrowUpRight/></div><div className="frame-project-card__body"><div><h2>{project.name}</h2><p>{project.description||"Ready for its first scene."}</p></div><footer><span><Layers3 size={14}/>{project.scenes?.length??0} scenes</span><span><Clock3 size={14}/>{date}</span></footer></div></Link>;
}
