import { beforeEach, describe, expect, it } from "vitest";
import { defaultTimeline, splitTimelineItem, useTimelineStore } from "../store/timeline-store";

describe("timeline state", () => {
  beforeEach(() => useTimelineStore.getState().load(defaultTimeline));

  it("splits an item while preserving its source position", () => {
    const document = { ...defaultTimeline, items: [{ id: "clip", trackId: "video-1", kind: "video" as const, startMs: 1000, durationMs: 5000, sourceStartMs: 400 }] };
    const result = splitTimelineItem(document, "clip", 3000);
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.durationMs).toBe(2000);
    expect(result.items[1]?.sourceStartMs).toBe(2400);
  });

  it("supports undo and redo around immutable updates", () => {
    const store = useTimelineStore.getState();
    store.update((document) => ({ ...document, durationMs: 60_000 }));
    expect(useTimelineStore.getState().document.durationMs).toBe(60_000);
    useTimelineStore.getState().undo();
    expect(useTimelineStore.getState().document.durationMs).toBe(30_000);
    useTimelineStore.getState().redo();
    expect(useTimelineStore.getState().document.durationMs).toBe(60_000);
  });
});
