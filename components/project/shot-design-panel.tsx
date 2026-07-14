"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, LoaderCircle, Plus, Sparkles } from "lucide-react";
import { api, ApiClientError, jsonBody } from "@/lib/api";
import type { Scene } from "@/lib/types";
import { shotDesignModes, type ShotDesignModeId } from "./shot-design-modes";

type GenerationOutput = { id: string; kind: "image" | "video" | "audio" | "plan" | "text"; uri?: string | null };
type GenerationJob = { id: string; status: "queued" | "running" | "retrying" | "succeeded" | "failed" | "canceled"; progress: number; outputs: GenerationOutput[] };
type ShotDesignResponse = { job: { id: string } };
type PromoteResponse = { scene: Scene };

export function ShotDesignPanel({
  projectId,
  selectedSceneId,
  onSceneUpdated,
}: {
  projectId: string;
  selectedSceneId?: string | null;
  onSceneUpdated?: (scene: Scene) => void;
}) {
  const [selected,setSelected] = useState<ShotDesignModeId | null>(null);
  const [pending,setPending] = useState(false);
  const [message,setMessage] = useState("");
  const [jobId,setJobId] = useState<string | null>(null);
  const mode = shotDesignModes.find((item) => item.id === selected);
  const job = useQuery({
    queryKey: ["generation-job", jobId],
    queryFn: () => api<GenerationJob>(`/generation-jobs/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "running" || status === "retrying" ? 2500 : false;
    },
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await api<ShotDesignResponse>("/shot-design-runs", {
        method: "POST",
        body: jsonBody({
          projectId,
          workflow: selected,
          prompt: data.get("prompt"),
          settings: {
            shotCount: Number(data.get("shotCount")),
            aspectRatio: data.get("aspectRatio"),
            includeAudio: data.get("includeAudio") === "on",
          },
          referenceAssetIds: [],
          providerKey: data.get("providerKey"),
          modelKey: data.get("modelKey"),
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      setJobId(response.job.id);
      setMessage("Generation queued.");
    } catch (caught) {
      setMessage(caught instanceof ApiClientError ? caught.message : "Could not start the run.");
    } finally {
      setPending(false);
    }
  }

  async function promote(output: GenerationOutput) {
    if (!jobId || !selectedSceneId) return;
    setMessage("Importing result.");
    try {
      const response = await api<PromoteResponse>(`/generation-jobs/${jobId}/promote-to-scene`, {
        method: "POST",
        body: jsonBody({ sceneId: selectedSceneId, outputId: output.id }),
      });
      onSceneUpdated?.(response.scene);
      setMessage("Result attached.");
    } catch (caught) {
      setMessage(caught instanceof ApiClientError ? caught.message : "Could not attach the result.");
    }
  }

  if (!mode) return <section className="shot-design">
    <header><div><p className="eyebrow">Seven focused workflows</p><h2>Choose how to begin.</h2></div><span>Each result stays ordered, versioned and reusable.</span></header>
    <div className="shot-mode-grid">{shotDesignModes.map(({ id, name, description, icon: Icon, accent }) => <button key={id} className={`shot-mode shot-mode--${accent}`} onClick={() => setSelected(id)}><span><Icon /></span><div><strong>{name}</strong><p>{description}</p></div><ArrowRight /></button>)}</div>
  </section>;

  const outputs = job.data?.outputs?.filter((output) => output.uri && ["image", "video", "audio"].includes(output.kind)) ?? [];

  return <section className="shot-config">
    <button className="text-button" onClick={() => setSelected(null)}><ArrowLeft size={16} />All workflows</button>
    <div className="shot-config__heading"><span className="shot-config__icon"><mode.icon /></span><div><p className="eyebrow">Shot Design</p><h2>{mode.name}</h2><p>{mode.description}</p></div></div>
    {message && <p className={message.includes("Could") || message.includes("unavailable") ? "form-error" : "form-success"}>{message}</p>}
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="shotPrompt">Creative direction</label><textarea id="shotPrompt" name="prompt" placeholder="A courier moves through a rain-soaked night market, camera low and close." required /></div>
      <div className="shot-config__row"><div className="field"><label htmlFor="shotCount">Shots</label><select id="shotCount" name="shotCount"><option>4</option><option>6</option><option>8</option><option>10</option></select></div><div className="field"><label htmlFor="aspectRatio">Aspect ratio</label><select id="aspectRatio" name="aspectRatio"><option>16:9</option><option>9:16</option><option>1:1</option>{selected === "billboard" && <option>4:1</option>}</select></div></div>
      <div className="shot-config__row"><div className="field"><label htmlFor="providerKey">Provider</label><select id="providerKey" name="providerKey"><option value="vertex">Origin orchestration</option><option value="fal">Motion models</option><option value="ark">Partner models</option><option value="openai">Image models</option></select></div><div className="field"><label htmlFor="modelKey">Model key</label><input id="modelKey" name="modelKey" defaultValue="auto" /></div></div>
      {selected === "voiceover" && <label className="check-field"><input name="includeAudio" type="checkbox" defaultChecked />Generate timed narration</label>}
      <button className="origin-button" disabled={pending}>{pending ? <LoaderCircle className="spin" /> : <><Sparkles size={17} />Generate</>}</button>
    </form>
    {job.data ? <aside className="generation-results"><header><strong>{job.data.status}</strong><span>{job.data.progress}%</span></header>{outputs.length ? outputs.map((output) => <button key={output.id} onClick={() => promote(output)} disabled={!selectedSceneId}>{output.kind}<span>Attach to selected scene</span></button>) : <p>Waiting for media outputs.</p>}</aside> : <aside className="reference-well"><Plus /><span>Add project images or PDFs as references</span></aside>}
  </section>;
}
