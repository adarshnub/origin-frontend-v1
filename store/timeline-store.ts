import { create } from "zustand";
import type { TimelineDocument, TimelineItem } from "@/lib/types";

export const defaultTimeline: TimelineDocument = { schemaVersion: 1, durationMs: 30_000, tracks: [{ id: "video-1", kind: "video", name: "Video" }, { id: "audio-1", kind: "audio", name: "Audio" }, { id: "captions-1", kind: "caption", name: "Captions" }], items: [], output: { width: 1920, height: 1080, fps: 30 } };
interface TimelineState { document: TimelineDocument; past: TimelineDocument[]; future: TimelineDocument[]; dirty: boolean; load: (document: TimelineDocument) => void; update: (recipe: (document: TimelineDocument) => TimelineDocument) => void; markSaved: () => void; undo: () => void; redo: () => void }

export const useTimelineStore = create<TimelineState>((set) => ({
  document: defaultTimeline, past: [], future: [], dirty: false,
  load: (document) => set({ document, past: [], future: [], dirty: false }),
  update: (recipe) => set((state) => ({ document: recipe(state.document), past: [...state.past.slice(-49), state.document], future: [], dirty: true })),
  markSaved: () => set({ dirty: false }),
  undo: () => set((state) => state.past.length ? { document: state.past.at(-1)!, past: state.past.slice(0,-1), future: [state.document,...state.future], dirty: true } : state),
  redo: () => set((state) => state.future.length ? { document: state.future[0]!, past: [...state.past,state.document], future: state.future.slice(1), dirty: true } : state),
}));

export function splitTimelineItem(document: TimelineDocument, itemId: string, atMs: number) {
  const item=document.items.find(candidate=>candidate.id===itemId);if(!item||atMs<=item.startMs||atMs>=item.startMs+item.durationMs)return document;
  const firstDuration=atMs-item.startMs;const second:TimelineItem={...item,id:crypto.randomUUID(),startMs:atMs,durationMs:item.durationMs-firstDuration,sourceStartMs:(item.sourceStartMs??0)+firstDuration};
  return {...document,items:document.items.flatMap(candidate=>candidate.id===itemId?[{...candidate,durationMs:firstDuration},second]:[candidate])};
}
