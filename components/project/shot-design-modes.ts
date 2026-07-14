import { AudioLines, GalleryHorizontalEnd, Images, LampDesk, LayoutTemplate, PanelsTopLeft, Repeat2 } from "lucide-react";

export const shotDesignModes = [
  { id: "storyboard", name: "Storyboard", description: "Turn a brief and references into a cinematic shot plan.", icon: LayoutTemplate, accent: "ember" },
  { id: "voiceover", name: "Voiceover Storyboard", description: "Build the visual sequence together with timed narration.", icon: AudioLines, accent: "amber" },
  { id: "multi_model", name: "Multi-model Lab", description: "Explore one direction across several image models.", icon: Images, accent: "rose" },
  { id: "continuity", name: "Continuity Sequence", description: "Carry identity, light and movement between ordered shots.", icon: Repeat2, accent: "sage" },
  { id: "relight", name: "Relight Studio", description: "Create a controlled lighting study from a portrait.", icon: LampDesk, accent: "blue" },
  { id: "partner", name: "Partner Models", description: "Access specialist image and motion model families.", icon: PanelsTopLeft, accent: "gold" },
  { id: "billboard", name: "Billboard", description: "Compose wide-format campaign frames with safe areas.", icon: GalleryHorizontalEnd, accent: "violet" },
] as const;

export type ShotDesignModeId = typeof shotDesignModes[number]["id"];
