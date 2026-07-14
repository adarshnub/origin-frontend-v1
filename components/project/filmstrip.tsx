"use client";

/* eslint-disable react-hooks/refs -- dnd-kit exposes sortable refs, listeners, and transform state for render-time wiring. */

import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FileText, GripVertical, ImageIcon, Music2, Play } from "lucide-react";
import type { Scene } from "@/lib/types";

function SceneGlyph({ scene }: { scene: Scene }) {
  if (scene.playback?.kind === "video") return <Play size={13} />;
  if (scene.playback?.kind === "audio") return <Music2 size={13} />;
  if (scene.playback?.kind === "document") return <FileText size={13} />;
  return <ImageIcon size={13} />;
}

function SortableScene({ scene, index, active, onSelect }: { scene: Scene; index: number; active: boolean; onSelect: () => void }) {
  const sortable = useSortable({ id: scene.id });

  return <div
    ref={sortable.setNodeRef}
    style={{ transform: CSS.Transform.toString(sortable.transform), transition: sortable.transition }}
    className={`filmstrip-scene ${active ? "active" : ""} ${sortable.isDragging ? "dragging" : ""}`}
  >
    <button className="filmstrip-grip" aria-label={`Drag ${scene.title}`} {...sortable.attributes} {...sortable.listeners}>
      <GripVertical size={14} />
    </button>
    <button className="filmstrip-select" onClick={onSelect} aria-label={`Select ${scene.title}`}>
      <span className="filmstrip-thumb"><SceneGlyph scene={scene} /></span>
      <span><strong>{String(index + 1).padStart(2, "0")}</strong><small>{scene.title}</small></span>
    </button>
  </div>;
}

export function Filmstrip({
  scenes,
  selectedId,
  onSelect,
  onReorder,
}: {
  scenes: Scene[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (scenes: Scene[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function ended(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = scenes.findIndex((scene) => scene.id === event.active.id);
    const newIndex = scenes.findIndex((scene) => scene.id === event.over!.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(scenes, oldIndex, newIndex));
  }

  return <section className="filmstrip">
    <header><span>Scene sequence</span><small>Drag handle to reorder</small></header>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={ended}>
      <SortableContext items={scenes.map((scene) => scene.id)} strategy={horizontalListSortingStrategy}>
        <div className="filmstrip-track">{scenes.map((scene, index) => <SortableScene key={scene.id} scene={scene} index={index} active={scene.id === selectedId} onSelect={() => onSelect(scene.id)} />)}</div>
      </SortableContext>
    </DndContext>
  </section>;
}
