"use client";

import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Play } from "lucide-react";
import type { Scene } from "@/lib/types";

function SortableScene({ scene, index, active, onSelect }: { scene: Scene; index: number; active: boolean; onSelect: () => void }) {
  const sortable=useSortable({id:scene.id});
  // dnd-kit intentionally exposes callback refs and reactive transform values for sortable elements.
  // eslint-disable-next-line react-hooks/refs
  return <button ref={sortable.setNodeRef} style={{transform:CSS.Transform.toString(sortable.transform),transition:sortable.transition}} className={`filmstrip-scene ${active?"active":""}`} onClick={onSelect}><span className="filmstrip-grip" {...sortable.attributes} {...sortable.listeners}><GripVertical size={14}/></span><span className="filmstrip-thumb"><Play size={13}/></span><span><strong>{String(index+1).padStart(2,"0")}</strong><small>{scene.title}</small></span></button>;
}

export function Filmstrip({ scenes, selectedId, onSelect, onReorder }: { scenes: Scene[]; selectedId: string | null; onSelect: (id: string) => void; onReorder: (scenes: Scene[]) => void }) {
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}));
  function ended(event:DragEndEvent){if(!event.over||event.active.id===event.over.id)return;const oldIndex=scenes.findIndex(scene=>scene.id===event.active.id);const newIndex=scenes.findIndex(scene=>scene.id===event.over!.id);onReorder(arrayMove(scenes,oldIndex,newIndex));}
  return <section className="filmstrip"><header><span>Scene sequence</span><small>Drag to reorder</small></header><DndContext sensors={sensors} onDragEnd={ended}><SortableContext items={scenes.map(scene=>scene.id)} strategy={horizontalListSortingStrategy}><div className="filmstrip-track">{scenes.map((scene,index)=><SortableScene key={scene.id} scene={scene} index={index} active={scene.id===selectedId} onSelect={()=>onSelect(scene.id)}/>)}</div></SortableContext></DndContext></section>;
}
