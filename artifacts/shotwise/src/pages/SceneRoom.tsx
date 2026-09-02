import { AppLayout } from "@/components/layout/AppLayout";
import { useGetScene, useUpdateScene, getGetSceneQueryKey, useGetProject, useAnalyzeScene, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, Lock, Unlock, Play, Send, Bot, User, Sparkles, Camera, List as ListIcon, BookOpen, AlertCircle, RefreshCw, FileText } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { Shot } from "@workspace/api-client-react";
import { getEffectiveSetupTime } from "@/lib/shot-list";

async function streamDirectorResponseCustom(
  input: { projectId: string, sceneId: string, message: string, challengeMode?: boolean, resources?: string, budget?: string, equipment?: string, crewExperience?: string },
  onChunk: (chunk: string) => void
) {
  const res = await fetch("/api/gemini/respond/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!res.ok) throw new Error("Failed to stream");
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const consumeEvents = (flush = false) => {
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = flush ? "" : (events.pop() ?? "");
    for (const event of flush ? events.concat(buffer) : events) {
      const data = event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "delta" && typeof parsed.text === "string") {
          onChunk(parsed.text);
        } else if (parsed.type === "error") {
          throw new Error(parsed.message || "The AI Second Unit could not respond.");
        }
      } catch (error) {
        if (error instanceof SyntaxError) continue;
        throw error;
      }
    }
  };

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      consumeEvents();
    }
    buffer += decoder.decode();
    consumeEvents(true);
  }
}

function DataLayer({ shot, displayIsAI }: { shot: Shot, displayIsAI: boolean }) {
  return (
    <div className="flex flex-col h-full fade-in duration-300">
      <div className="grid grid-cols-1 gap-y-4 text-sm font-sans mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">Framing</span>
            <span className="font-medium">{shot.framing}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">Lens</span>
            <span className="font-medium">{shot.lens}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">Angle</span>
            <span className="font-medium">{shot.angle}</span>
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">Movement</span>
            <span className="font-medium">{shot.movement}</span>
          </div>
        </div>

        <div className="pt-2 border-t">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">Lighting</span>
          <span>{shot.lighting}</span>
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground block mb-1">Composition</span>
          <span>{shot.composition}</span>
        </div>

        <div className="mt-2 bg-muted/20 p-4 border-l-2 border-primary">
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary block mb-2">Directorial Rationale</span>
          <p className="font-serif italic text-base text-foreground/90 leading-relaxed">"{shot.rationale}"</p>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono bg-card border border-border p-3">
          {displayIsAI ? (
            <>
              <div className="flex flex-col gap-1"><span className="text-[9px] text-muted-foreground uppercase font-bold">Tool</span> <span className="truncate" title={shot.modelTool ?? undefined}>{shot.modelTool || "-"}</span></div>
              <div className="flex flex-col gap-1"><span className="text-[9px] text-muted-foreground uppercase font-bold">Cost</span> <span className="truncate" title={shot.computeGenerationCost ?? undefined}>{shot.computeGenerationCost || "-"}</span></div>
              <div className="flex flex-col gap-1"><span className="text-[9px] text-muted-foreground uppercase font-bold">Iter</span> <span className="truncate" title={shot.promptIterationTime ?? undefined}>{shot.promptIterationTime || "-"}</span></div>
              <div className="flex flex-col gap-1"><span className="text-[9px] text-muted-foreground uppercase font-bold">Cons</span> <span className="truncate" title={shot.consistencyAcrossShots ?? undefined}>{shot.consistencyAcrossShots || "-"}</span></div>
              <div className="col-span-2 flex flex-col gap-1"><span className="text-[9px] text-muted-foreground uppercase font-bold">Post</span> <span className="truncate" title={shot.upscalingPostNeeds ?? undefined}>{shot.upscalingPostNeeds || "-"}</span></div>
            </>
          ) : (
            <>
              <div className="col-span-3 flex flex-col gap-1"><span className="text-[9px] text-muted-foreground uppercase font-bold">Gear</span> <span className="truncate text-primary" title={shot.equipment?.join(", ") ?? undefined}>{shot.equipment?.join(", ") || "-"}</span></div>
              <div className="flex flex-col gap-1"><span className="text-[9px] text-muted-foreground uppercase font-bold">Time</span> <span>{getEffectiveSetupTime(shot)}</span></div>
              <div className="col-span-2 flex flex-col gap-1"><span className="text-[9px] text-muted-foreground uppercase font-bold">Budget Impact</span> <span className="truncate" title={shot.budgetImpact ?? undefined}>{shot.budgetImpact}</span></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PrevisLayer({ shot }: { shot: Shot }) {
  const framingLower = (shot.framing || "").toLowerCase();
  const angleLower = (shot.angle || "").toLowerCase();
  const lightLower = (shot.lighting || "").toLowerCase();
  const moveLower = (shot.movement || "").toLowerCase();

  let scale = 1;
  let subY = 0;
  if (framingLower.includes("extreme close") || framingLower.includes("ecu")) { scale = 4; subY = 50; }
  else if (framingLower.includes("close") || framingLower.includes("cu")) { scale = 2.5; subY = 35; }
  else if (framingLower.includes("medium") || framingLower.includes("ms") || framingLower.includes("cowboy")) { scale = 1.3; subY = 15; }
  else if (framingLower.includes("extreme wide") || framingLower.includes("ews")) { scale = 0.4; subY = -15; }
  else if (framingLower.includes("wide") || framingLower.includes("ws")) { scale = 0.7; subY = -5; }
  else { scale = 1; subY = 0; }

  let horizonY = 50;
  if (angleLower.includes("high") || angleLower.includes("top") || angleLower.includes("bird") || angleLower.includes("overhead")) horizonY = 20;
  else if (angleLower.includes("low") || angleLower.includes("worm")) horizonY = 80;

  let bgFill = "hsl(var(--muted))";
  let subFill = "hsl(var(--foreground))";
  let gridStroke = "hsl(var(--border))";
  let isDark = false;

  if (lightLower.includes("silhouette") || lightLower.includes("backlight")) {
    bgFill = "hsl(var(--muted))";
    subFill = "hsl(var(--background))";
    gridStroke = "hsl(var(--primary))";
  } else if (lightLower.includes("low key") || lightLower.includes("dark") || lightLower.includes("chiaroscuro") || lightLower.includes("moody")) {
    bgFill = "hsl(var(--foreground))";
    subFill = "hsl(var(--muted))";
    gridStroke = "hsl(var(--muted-foreground))";
    isDark = true;
  } else if (lightLower.includes("high key") || lightLower.includes("bright")) {
    bgFill = "hsl(var(--background))";
    subFill = "hsl(var(--foreground))";
    gridStroke = "hsl(var(--border))";
  } else {
    bgFill = "hsl(var(--card))";
    subFill = "hsl(var(--foreground))";
    gridStroke = "hsl(var(--border))";
  }

  let rotation = 0;
  if (angleLower.includes("dutch") || angleLower.includes("tilt")) rotation = 15;

  return (
    <div className="flex flex-col gap-4 h-full fade-in duration-300">
      <div className="relative w-full aspect-video border-[4px] border-black bg-black overflow-hidden group">
        <svg viewBox="0 0 160 90" className="w-full h-full text-xs font-mono transition-transform duration-700 ease-out group-hover:scale-105">
          <rect width="160" height="90" fill={bgFill} />

          <g transform={`rotate(${rotation}, 80, 45)`}>
            <line x1="-40" y1={horizonY} x2="200" y2={horizonY} stroke={gridStroke} strokeWidth="0.5" />
            <line x1="80" y1={horizonY} x2="-20" y2="120" stroke={gridStroke} strokeWidth="0.5" opacity="0.3" />
            <line x1="80" y1={horizonY} x2="80" y2="120" stroke={gridStroke} strokeWidth="0.5" opacity="0.3" />
            <line x1="80" y1={horizonY} x2="180" y2="120" stroke={gridStroke} strokeWidth="0.5" opacity="0.3" />

            <g transform={`translate(80, ${45 + subY}) scale(${scale})`}>
               <circle cx="0" cy="-20" r="10" fill={subFill} />
               <path d="M-14,0 Q0,-12 14,0 L16,30 L-16,30 Z" fill={subFill} />
            </g>
          </g>

          <g stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {(moveLower.includes("pan") || moveLower.includes("track")) && (
               <g className="opacity-80">
                 <path d="M 20,45 L 140,45" opacity="0.3" strokeDasharray="2 2" />
                 <path d="M 130,40 L 140,45 L 130,50" />
                 <path d="M 30,40 L 20,45 L 30,50" />
               </g>
            )}
            {(moveLower.includes("tilt") || moveLower.includes("crane") || moveLower.includes("jib") || moveLower.includes("pedestal")) && !angleLower.includes("dutch") && (
               <g className="opacity-80">
                 <path d="M 150,20 L 150,70" opacity="0.3" strokeDasharray="2 2" />
                 <path d="M 145,30 L 150,20 L 155,30" />
                 <path d="M 145,60 L 150,70 L 155,60" />
               </g>
            )}
            {(moveLower.includes("push") || moveLower.includes("in") || moveLower.includes("zoom in") || moveLower.includes("dolly in")) && (
               <g className="opacity-80">
                 <rect x="20" y="11.25" width="120" height="67.5" strokeDasharray="2 2" opacity="0.4" />
                 <path d="M 5,5 L 20,11.25 M 155,5 L 140,11.25 M 5,85 L 20,78.75 M 155,85 L 140,78.75" />
                 <path d="M 10,11.25 L 20,11.25 L 20,5" />
                 <path d="M 150,11.25 L 140,11.25 L 140,5" />
                 <path d="M 10,78.75 L 20,78.75 L 20,85" />
                 <path d="M 150,78.75 L 140,78.75 L 140,85" />
               </g>
            )}
            {(moveLower.includes("pull") || moveLower.includes("out") || moveLower.includes("zoom out") || moveLower.includes("dolly out")) && (
               <g className="opacity-80">
                 <rect x="20" y="11.25" width="120" height="67.5" strokeDasharray="2 2" opacity="0.4" />
                 <path d="M 20,11.25 L 5,5 M 140,11.25 L 155,5 M 20,78.75 L 5,85 M 140,78.75 L 155,85" />
                 <path d="M 15,5 L 5,5 L 5,15" />
                 <path d="M 145,5 L 155,5 L 155,15" />
                 <path d="M 15,85 L 5,85 L 5,75" />
                 <path d="M 145,85 L 155,85 L 155,75" />
               </g>
            )}
          </g>

          {/* Camera Frame Guide Lines */}
          <g stroke="rgba(255,255,255,0.4)" strokeWidth="0.2" fill="none">
            <rect x="8" y="4.5" width="144" height="81" />
            <path d="M 75,45 L 85,45 M 80,40 L 80,50" />
            <text x="10" y="12" fill="rgba(255,255,255,0.6)" fontSize="4" fontFamily="monospace">REC</text>
            <circle cx="22" cy="10.5" r="1.5" fill="hsl(var(--primary))" />
          </g>

          {(shot.composition || "").toLowerCase().includes("rule of thirds") && (
             <g stroke={isDark ? "hsl(var(--muted-foreground))" : "hsl(var(--muted-foreground))"} strokeWidth="0.5" opacity="0.4" strokeDasharray="1 2">
               <line x1="53.3" y1="0" x2="53.3" y2="90" />
               <line x1="106.6" y1="0" x2="106.6" y2="90" />
               <line x1="0" y1="30" x2="160" y2="30" />
               <line x1="0" y1="60" x2="160" y2="60" />
             </g>
          )}
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs font-mono text-muted-foreground p-3 bg-card border-2 border-border mt-auto">
        <div className="flex flex-col"><strong className="text-[9px] uppercase tracking-widest text-foreground/50 mb-1">Composition Target</strong> <span className="text-foreground">{shot.composition}</span></div>
        <div className="flex flex-col"><strong className="text-[9px] uppercase tracking-widest text-foreground/50 mb-1">Focal Length Target</strong> <span className="text-foreground">{shot.lens}</span></div>
      </div>
    </div>
  );
}

function RefsLayer({ shot }: { shot: Shot }) {
  return (
    <div className="space-y-6 h-full fade-in duration-300 flex flex-col">
      <div className="bg-muted/40 p-3 border-l-4 border-primary">
        <p className="text-[10px] text-muted-foreground uppercase font-mono tracking-widest leading-relaxed">
          These notes reflect real-world artistic references. They are analytical attributions for study, not exact recreations.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6">
        <div>
          <h5 className="font-mono text-[10px] uppercase font-bold text-foreground mb-3 flex items-center gap-2 tracking-widest">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Visual References
          </h5>
          {shot.referenceExamples?.length ? (
            <ul className="space-y-3">
              {shot.referenceExamples.map((ex, i) => (
                <li key={i} className="text-sm bg-card p-4 border border-border group hover:border-primary/50 transition-colors relative">
                   <div className="absolute -left-px top-2 bottom-2 w-[2px] bg-primary/0 group-hover:bg-primary transition-colors"></div>
                   <div className="font-bold flex flex-wrap items-baseline gap-x-2 text-foreground leading-tight mb-2">
                     <span className="text-base">{ex.title}</span>
                     <span className="font-normal text-muted-foreground italic font-serif lowercase">from</span>
                     <span className="font-serif italic">{ex.work}</span>
                   </div>
                   <div className="flex flex-wrap gap-2">
                     <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase tracking-widest px-2 py-1 bg-muted/50 border border-border/50">
                       {ex.medium}
                     </span>
                     <span className="text-[9px] font-bold text-muted-foreground font-mono uppercase tracking-widest px-2 py-1 bg-muted/50 border border-border/50">
                       {ex.technique}
                     </span>
                   </div>
                   {ex.url && (
                     <div className="mt-3 pt-3 border-t">
                        <a href={ex.url} className="relative z-10 text-primary hover:text-primary-foreground hover:bg-primary inline-flex items-center gap-2 px-3 py-1.5 transition-colors text-[10px] font-mono font-bold uppercase tracking-widest border border-primary/20">
                         Review Source <ChevronLeft className="w-3 h-3 rotate-180" />
                       </a>
                     </div>
                   )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm font-serif text-muted-foreground italic p-6 border border-dashed border-border bg-card/30 text-center">
              No specific works referenced for this shot.
            </div>
          )}
        </div>

        <div>
          <h5 className="font-mono text-[10px] uppercase font-bold text-foreground mb-3 tracking-widest">Technical Resources</h5>
          {shot.learningResources?.length ? (
            <ul className="space-y-3">
              {shot.learningResources.map((res, i) => (
                <li key={i} className="bg-card p-3 border border-border flex justify-between items-center group hover:border-primary/50 transition-colors">
                   <div className="overflow-hidden mr-4">
                     <div className="font-bold text-sm text-foreground truncate">{res.title}</div>
                     <div className="text-[9px] text-muted-foreground font-mono uppercase tracking-widest font-bold mt-1">{res.kind}</div>
                   </div>
                    <a href={res.url} className="relative z-10 shrink-0 text-primary border border-primary/20 px-3 py-2 hover:bg-primary hover:text-primary-foreground transition-colors font-mono font-bold uppercase tracking-widest text-[10px] flex items-center gap-1">
                     Study <ChevronLeft className="w-3 h-3 rotate-180" />
                   </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm font-serif text-muted-foreground italic p-6 border border-dashed border-border bg-card/30 text-center">
              No technical resources linked.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShotCard({ shot, onUpdate, index }: { shot: Shot, onUpdate: (idx: number, s: Shot) => void, index: number }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedShot, setEditedShot] = useState<Shot>(shot);
  const [layer, setLayer] = useState<'data' | 'previs' | 'refs'>('data');

  useEffect(() => {
    setEditedShot(shot);
  }, [shot]);

  const handleSave = () => {
    onUpdate(index, editedShot);
    setIsEditing(false);
  };

  const isAI = editedShot.sourceType === "ai-generated";
  const displayIsAI = shot.sourceType === "ai-generated";

  if (isEditing) {
    return (
      <Card className="rounded-none border-2 border-l-4 border-l-primary p-5 bg-card mb-6 shadow-xl z-10 relative">
        <div className="flex justify-between items-center mb-4 pb-3 border-b">
          <h4 className="font-mono font-bold text-sm uppercase tracking-widest">Override Shot {editedShot.shotNumber}</h4>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-mono uppercase tracking-widest rounded-none" onClick={() => setIsEditing(false)}>Cancel</Button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-muted-foreground uppercase font-bold tracking-widest font-mono text-[9px] mb-1 block">Origin Profile</label>
            <select
              value={editedShot.sourceType}
              onChange={e => setEditedShot({ ...editedShot, sourceType: e.target.value as any })}
              className="w-full bg-background border-2 border-input h-10 px-3 font-mono text-sm focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="practical">Practical Photography</option>
              <option value="ai-generated">Synthetic / AI Generation</option>
            </select>
          </div>

          {isAI ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/20 p-4 border border-border">
              <h5 className="col-span-full font-mono text-[10px] font-bold uppercase tracking-widest border-b pb-2 mb-2 text-primary">Synthetic Specs</h5>
              <div>
                <label className="text-muted-foreground uppercase font-bold tracking-widest font-mono text-[9px] mb-1 block">Generation Model</label>
                <Input value={editedShot.modelTool || ""} onChange={e => setEditedShot({ ...editedShot, modelTool: e.target.value })} className="h-9 font-mono text-xs rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary" />
              </div>
              <div>
                <label className="text-muted-foreground uppercase font-bold tracking-widest font-mono text-[9px] mb-1 block">Compute Allocation</label>
                <Input value={editedShot.computeGenerationCost || ""} onChange={e => setEditedShot({ ...editedShot, computeGenerationCost: e.target.value })} className="h-9 font-mono text-xs rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary" />
              </div>
              <div>
                <label className="text-muted-foreground uppercase font-bold tracking-widest font-mono text-[9px] mb-1 block">Est. Iterations</label>
                <Input value={editedShot.promptIterationTime || ""} onChange={e => setEditedShot({ ...editedShot, promptIterationTime: e.target.value })} className="h-9 font-mono text-xs rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary" />
              </div>
              <div>
                <label className="text-muted-foreground uppercase font-bold tracking-widest font-mono text-[9px] mb-1 block">Continuity Threat</label>
                <Input value={editedShot.consistencyAcrossShots || ""} onChange={e => setEditedShot({ ...editedShot, consistencyAcrossShots: e.target.value })} className="h-9 font-mono text-xs rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary" />
              </div>
              <div className="col-span-full">
                <label className="text-muted-foreground uppercase font-bold tracking-widest font-mono text-[9px] mb-1 block">Post-Production Intervention</label>
                <Input value={editedShot.upscalingPostNeeds || ""} onChange={e => setEditedShot({ ...editedShot, upscalingPostNeeds: e.target.value })} className="h-9 font-mono text-xs rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary" />
              </div>
            </div>
          ) : (
            <div className="bg-muted/20 p-4 border border-border">
              <h5 className="font-mono text-[10px] font-bold uppercase tracking-widest border-b pb-2 mb-4 text-primary">Practical Specs</h5>
              <div>
                <label className="text-muted-foreground uppercase font-bold tracking-widest font-mono text-[9px] mb-1 block flex justify-between">
                  <span>Setup Time Allocation</span>
                  <span className="text-muted-foreground/50">Base: {editedShot.setupTime || 'N/A'}</span>
                </label>
                <Input value={editedShot.setupTimeOverride || ""} onChange={e => setEditedShot({ ...editedShot, setupTimeOverride: e.target.value.trim() ? e.target.value : null })} className="h-10 font-mono text-sm rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary" placeholder="e.g. 45 mins (complexity override)" />
              </div>
            </div>
          )}
        </div>
        <Button onClick={handleSave} className="w-full h-12 mt-6 rounded-none font-mono uppercase tracking-widest text-xs">Commit Adjustments</Button>
      </Card>
    );
  }

  return (
    <Card className="rounded-none border-2 overflow-hidden border-l-[6px] border-l-border bg-card mb-6 group hover:border-l-primary transition-all flex flex-col shadow-none hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))] hover:-translate-y-1">
      <div className="p-5 pb-4 flex justify-between items-start border-b bg-muted/10">
        <div className="flex gap-4">
          <div className="w-12 h-12 shrink-0 bg-background border flex items-center justify-center font-serif text-2xl text-foreground font-bold">
            {shot.shotNumber}
          </div>
          <div>
            <h4 className="font-bold font-serif text-xl leading-tight">{shot.shotType}</h4>
            <div className="text-[10px] font-bold text-muted-foreground font-mono mt-1 uppercase tracking-widest max-w-[250px] truncate">{shot.framing} &middot; {shot.angle}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-widest rounded-none ${displayIsAI ? 'border-accent text-accent-foreground bg-accent/10' : 'bg-background'}`}>
            {shot.sourceType}
          </Badge>
          <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-[9px] uppercase tracking-widest font-bold font-mono text-primary hover:underline transition-opacity">Adjust Specs</button>
        </div>
      </div>

      <div className="px-5 py-5 flex-1 min-h-[250px]">
         {layer === 'data' && <DataLayer shot={shot} displayIsAI={displayIsAI} />}
         {layer === 'previs' && <PrevisLayer shot={shot} />}
         {layer === 'refs' && <RefsLayer shot={shot} />}
      </div>

      <div className="flex border-t border-border mt-auto bg-muted/20">
        <button
          onClick={() => setLayer('data')}
          className={`flex-1 flex flex-col items-center justify-center py-3 text-[9px] font-mono font-bold uppercase tracking-widest gap-2 transition-colors ${layer === 'data' ? 'bg-background text-primary border-t-2 border-t-primary -mt-[1px]' : 'text-muted-foreground hover:bg-background hover:text-foreground border-t-2 border-t-transparent -mt-[1px]'}`}
        >
          <ListIcon className="w-4 h-4" />
          <span>Spec Sheet</span>
        </button>
        <button
          onClick={() => setLayer('previs')}
          className={`flex-1 flex border-l border-border flex-col items-center justify-center py-3 text-[9px] font-mono font-bold uppercase tracking-widest gap-2 transition-colors ${layer === 'previs' ? 'bg-background text-primary border-t-2 border-t-primary -mt-[1px]' : 'text-muted-foreground hover:bg-background hover:text-foreground border-t-2 border-t-transparent -mt-[1px]'}`}
        >
          <Camera className="w-4 h-4" />
          <span>Previs Frame</span>
        </button>
        <button
          onClick={() => setLayer('refs')}
          className={`flex-1 flex border-l border-border flex-col items-center justify-center py-3 text-[9px] font-mono font-bold uppercase tracking-widest gap-2 transition-colors ${layer === 'refs' ? 'bg-background text-primary border-t-2 border-t-primary -mt-[1px]' : 'text-muted-foreground hover:bg-background hover:text-foreground border-t-2 border-t-transparent -mt-[1px]'}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>References</span>
        </button>
      </div>
    </Card>
  )
}

export default function SceneRoomWrapper() {
  const [match, params] = useRoute("/app/:projectId/scenes/:sceneId");
  if (!match || !params) return null;
  return <SceneRoom projectId={params.projectId} sceneId={params.sceneId} />;
}

function SceneRoom({ projectId, sceneId }: { projectId: string, sceneId: string }) {
  const queryClient = useQueryClient();
  const { data: project } = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } });
  const { data: scene, isLoading } = useGetScene(projectId, sceneId, { query: { enabled: !!projectId && !!sceneId, queryKey: getGetSceneQueryKey(projectId, sceneId) } });

  const updateScene = useUpdateScene();
  const analyzeScene = useAnalyzeScene();

  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");

  const [resources, setResources] = useState("");
  const [budget, setBudget] = useState("");
  const [equipment, setEquipment] = useState("");
  const [crew, setCrew] = useState("");
  const [challengeMode, setChallengeMode] = useState(false);

  // Only sync state from server if it hasn't been modified locally, or if we switched scenes
  const lastSyncRef = useRef<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Track planning inputs locally for the update API call
  const planRef = useRef({ resources: "", budget: "", equipment: "", crewExperience: "", challengeMode: false });

  useEffect(() => {
    // Only initialize when we load a new scene or don't have data yet
    if (scene && lastSyncRef.current !== sceneId) {
      lastSyncRef.current = sceneId;
      setResources(scene.resources || "");
      setBudget(scene.budget || "");
      setEquipment(scene.equipment || "");
      setCrew(scene.crewExperience || "");
      setChallengeMode(scene.challengeMode || false);

      planRef.current = {
        resources: scene.resources || "",
        budget: scene.budget || "",
        equipment: scene.equipment || "",
        crewExperience: scene.crewExperience || "",
        challengeMode: scene.challengeMode || false
      };
    }
  }, [scene, sceneId]);

  useEffect(() => {
    if (isStreaming && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [streamedResponse, isStreaming]);

  const handleResourceUpdate = useCallback((overrideChallengeMode?: boolean) => {
    if (!scene) return;

    const newMode = overrideChallengeMode !== undefined ? overrideChallengeMode : challengeMode;

    planRef.current = {
      resources,
      budget,
      equipment,
      crewExperience: crew,
      challengeMode: newMode
    };

    updateScene.mutate({
      projectId, sceneId, data: planRef.current
    }, {
      onSuccess: (data) => {
        // Use setQueryData to merge just the updated fields rather than a full replace,
        // to prevent UI flicker while editing
        queryClient.setQueryData(getGetSceneQueryKey(projectId, sceneId), (old: any) =>
          old ? { ...old, ...planRef.current } : data
        );
      }
    });
  }, [scene, projectId, sceneId, resources, budget, equipment, crew, challengeMode, updateScene, queryClient]);

  const handleAnalyze = () => {
    if (!scene) return;

    // Ensure we're analyzing with the most up-to-date planning inputs
    const currentParams = {
        sceneText: scene.sceneText,
        resources: planRef.current.resources,
        budget: planRef.current.budget,
        equipment: planRef.current.equipment,
        crewExperience: planRef.current.crewExperience,
        history: scene.messages || [],
        challengeMode: planRef.current.challengeMode,
        projectId,
        sceneId,
        projectType: project?.projectType
    };

    analyzeScene.mutate({ data: currentParams }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSceneQueryKey(projectId, sceneId) });
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
      }
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !scene) return;

    setIsStreaming(true);
    setStreamedResponse("");
    const userMsg = message;
    setMessage("");

    // Optimistically update UI
    const oldScene = queryClient.getQueryData<any>(getGetSceneQueryKey(projectId, sceneId));
    if (oldScene) {
      queryClient.setQueryData(getGetSceneQueryKey(projectId, sceneId), {
        ...oldScene,
        messages: [...(oldScene.messages || []), { role: "director", content: userMsg }]
      });
    }

    try {
      await streamDirectorResponseCustom({
        projectId, sceneId, message: userMsg,
        challengeMode: planRef.current.challengeMode,
        resources: planRef.current.resources,
        budget: planRef.current.budget,
        equipment: planRef.current.equipment,
        crewExperience: planRef.current.crewExperience
      }, (chunk) => {
        setStreamedResponse(prev => prev + chunk);
      });
      // Invalidate fully to get the final shots and messages
      queryClient.invalidateQueries({ queryKey: getGetSceneQueryKey(projectId, sceneId) });
    } catch(err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
      setStreamedResponse("");
    }
  };

  const handleUpdateShot = (index: number, updatedShot: Shot) => {
    if (!scene) return;
    const newShots = [...(scene.shots || [])];
    newShots[index] = updatedShot;
    updateScene.mutate({ projectId, sceneId, data: { shots: newShots } }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetSceneQueryKey(projectId, sceneId), data);
      }
    });
  };

  const toggleLock = () => {
    if (!scene) return;
    updateScene.mutate({
      projectId, sceneId, data: { locked: !scene.locked }
    }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetSceneQueryKey(projectId, sceneId), (old: any) =>
          old ? { ...old, locked: data.locked } : data
        );
      }
    });
  };

  if (isLoading || !scene) return <AppLayout><div className="p-12 flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;

  const isAIProject = project?.projectType === "ai-generated";
  const isHybridProject = project?.projectType === "hybrid";

  const labels = {
    resources: isAIProject ? "Consistency & Post Needs" : isHybridProject ? "Resources / Post Needs" : "Resources",
    budget: isAIProject ? "Compute / Generation Cost" : isHybridProject ? "Budget / Compute Cost" : "Budget",
    equipment: isAIProject ? "Model / Tool Choice" : isHybridProject ? "Equipment / Model Choice" : "Equipment",
    crew: isAIProject ? "Prompt Iteration Time" : isHybridProject ? "Crew / Iteration Time" : "Crew Experience",
  };

  return (
    <AppLayout>
      <div className="flex h-full divide-x-2 divide-border">
        {/* Left Column: Context & Setup */}
        <div className="w-[420px] shrink-0 bg-background overflow-y-auto flex flex-col relative z-10 shadow-[4px_0px_24px_rgba(0,0,0,0.05)]">
          <div className="p-6 pb-0 sticky top-0 bg-background/95 backdrop-blur z-20 pt-8">
            <Link href={`/app/${projectId}`} className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-8 bg-muted/30 px-3 py-1.5 rounded-sm">
              <ChevronLeft className="w-3 h-3" /> Back to Slate
            </Link>

            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="font-mono text-sm font-bold uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary inline-block"></span>
                  SCENE {scene.sceneNumber}
                </h2>
                <h3 className="font-serif text-3xl leading-tight pr-4">{scene.title}</h3>
              </div>
              <Button
                variant={scene.locked ? "default" : "outline"}
                size="icon"
                className={`shrink-0 rounded-none h-12 w-12 border-2 ${scene.locked ? 'bg-primary hover:bg-primary/90 shadow-[2px_2px_0px_0px_black]' : 'hover:border-primary hover:text-primary'}`}
                onClick={toggleLock}
                title={scene.locked ? "Unlock Scene" : "Lock Scene"}
              >
                {scene.locked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          <div className="p-6 pt-2 flex-1 flex flex-col gap-8">
            <div className="space-y-3">
              <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-2 border-b pb-2">
                <FileText className="w-3 h-3" /> Script Source
              </h4>
              <div className="text-sm font-sans whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto p-5 bg-card border-2 border-border shadow-inner font-medium">
                {scene.sceneText}
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="font-mono text-[9px] uppercase tracking-widest font-bold text-muted-foreground">Production Constraints</h4>
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <span className={`text-[9px] font-mono font-bold uppercase tracking-widest ${challengeMode ? "text-accent" : "text-muted-foreground group-hover:text-foreground"}`}>Challenge Mode</span>
                  <div className={`w-10 h-5 border-2 relative transition-colors ${challengeMode ? 'border-accent bg-accent/20' : 'border-input bg-card'}`}>
                    <div className={`absolute top-0.5 bottom-0.5 w-3 bg-foreground transition-all ${challengeMode ? 'left-[22px] bg-accent' : 'left-0.5'}`}></div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={challengeMode}
                      onChange={e => {
                        const val = e.target.checked;
                        setChallengeMode(val);
                        handleResourceUpdate(val);
                      }}
                    />
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 bg-muted/20 border border-border">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase font-mono text-foreground/80 tracking-widest">{labels.resources}</label>
                  <Input value={resources} onChange={e => setResources(e.target.value)} onBlur={() => handleResourceUpdate()} className="h-10 text-sm font-sans rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary bg-background shadow-none" placeholder="e.g. Minimal, Studio lot, Location..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase font-mono text-foreground/80 tracking-widest">{labels.budget}</label>
                  <Input value={budget} onChange={e => setBudget(e.target.value)} onBlur={() => handleResourceUpdate()} className="h-10 text-sm font-sans rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary bg-background shadow-none" placeholder="e.g. Indie, High, Restricted..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase font-mono text-foreground/80 tracking-widest">{labels.equipment}</label>
                  <Input value={equipment} onChange={e => setEquipment(e.target.value)} onBlur={() => handleResourceUpdate()} className="h-10 text-sm font-sans rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary bg-background shadow-none" placeholder="e.g. Handheld only, Steadicam, Cranes..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase font-mono text-foreground/80 tracking-widest">{labels.crew}</label>
                  <Input value={crew} onChange={e => setCrew(e.target.value)} onBlur={() => handleResourceUpdate()} className="h-10 text-sm font-sans rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary bg-background shadow-none" placeholder="e.g. Student, Professional, Skeleton..." />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Chat & AI */}
        <div className="flex-[1.2] flex flex-col h-full bg-card relative z-0">
          <div className="flex justify-between items-center px-6 py-4 border-b bg-background sticky top-0 z-10">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" /> AI Second Unit
            </h3>
            {scene.shots && scene.shots.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalyze}
                disabled={analyzeScene.isPending || isStreaming}
                className="h-8 rounded-none font-mono text-[9px] uppercase tracking-widest font-bold border-2 hover:bg-muted"
              >
                {analyzeScene.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <RefreshCw className="w-3 h-3 mr-2" />}
                Re-Analyze Scene
              </Button>
            )}
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-card/50 scroll-smooth">
            {!scene.shots || scene.shots.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto opacity-80">
                <div className="w-16 h-16 border-2 border-primary/30 flex items-center justify-center rotate-45 mb-8">
                  <Bot className="w-8 h-8 -rotate-45 text-primary" />
                </div>
                <h3 className="font-serif text-2xl mb-3">Begin the Breakdown</h3>
                <p className="text-sm font-sans text-muted-foreground mb-8">
                  Provide directorial vision to generate the initial shot list.
                  Mention specific moods, reference films, or pacing you want.
                </p>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeScene.isPending || isStreaming}
                  className="rounded-none h-12 px-8 font-mono text-[10px] font-bold uppercase tracking-widest shadow-[4px_4px_0px_0px_hsl(var(--primary)/0.3)] hover:translate-y-1 hover:translate-x-1 hover:shadow-none transition-all"
                >
                  {analyzeScene.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</> : "Generate Initial Coverage"}
                </Button>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {scene.messages?.map((msg, i) => (
                  <div key={i} className={`flex gap-4 ${msg.role === "director" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-8 h-8 shrink-0 flex items-center justify-center border-2 ${msg.role === "director" ? "bg-foreground text-background border-foreground" : "bg-card text-primary border-primary"}`}>
                      {msg.role === "director" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[85%] text-sm font-sans leading-relaxed ${msg.role === "director" ? "bg-muted p-4 border-2 border-border" : ""}`}>
                      {msg.role === "director" ? (
                        msg.content
                      ) : (
                        <div className="prose prose-sm max-w-none font-sans text-foreground [&_*]:text-foreground" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      )}
                    </div>
                  </div>
                ))}

                {streamedResponse && (
                  <div className="flex gap-4 flex-row">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center border-2 bg-card text-primary border-primary">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="max-w-[85%] text-sm font-sans leading-relaxed">
                      <div className="prose prose-sm max-w-none font-sans text-foreground [&_*]:text-foreground" dangerouslySetInnerHTML={{ __html: streamedResponse.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-1 align-middle"></span>
                    </div>
                  </div>
                )}

                {(analyzeScene.isPending || isStreaming) && !streamedResponse && (
                  <div className="flex gap-4 flex-row">
                    <div className="w-8 h-8 shrink-0 flex items-center justify-center border-2 bg-card text-primary border-primary">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="max-w-[85%] flex items-center p-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-4 bg-background border-t">
            <form onSubmit={handleSendMessage} className="relative max-w-3xl mx-auto">
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Give notes to the AI Second Unit..."
                className="w-full min-h-[60px] max-h-[200px] rounded-none border-2 pr-14 py-4 text-sm font-sans focus-visible:ring-0 focus-visible:border-primary resize-y"
                disabled={analyzeScene.isPending || isStreaming || scene.locked}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!message.trim() || analyzeScene.isPending || isStreaming || scene.locked}
                className="absolute right-2 bottom-2 h-10 w-10 rounded-none bg-foreground text-background hover:bg-primary hover:text-primary-foreground"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
            {scene.locked && (
              <div className="text-center mt-3 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest text-primary font-bold">
                <Lock className="w-3 h-3" /> Scene Locked
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Shot List */}
        <div className="flex-1 bg-muted/10 overflow-y-auto border-l-2 shadow-inner">
          <div className="p-6 pb-4 sticky top-0 bg-muted/95 backdrop-blur z-10 border-b flex justify-between items-end">
            <div>
              <h3 className="font-serif text-3xl">Shot List</h3>
              <p className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground mt-1">
                {scene.shots?.length || 0} Shots Configured
              </p>
            </div>
            {scene.readyToLock && !scene.locked && (
              <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent font-mono text-[9px] uppercase tracking-widest rounded-none font-bold">
                <Sparkles className="w-3 h-3 mr-1" /> Ready for Lock
              </Badge>
            )}
          </div>

          <div className="p-6 space-y-2">
            {!scene.shots || scene.shots.length === 0 ? (
              <div className="text-center p-12 text-sm font-serif italic text-muted-foreground/60 border-2 border-dashed border-border/50">
                Awaiting directorial breakdown.
              </div>
            ) : (
              scene.shots.map((shot, index) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  index={index}
                  onUpdate={handleUpdateShot}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}