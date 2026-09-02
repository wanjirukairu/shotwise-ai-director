import { AppLayout } from "@/components/layout/AppLayout";
import { useListProjects, useGetProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clapperboard, Layers, Calendar, DollarSign, PenTool, ArrowRight, Download } from "lucide-react";
import { Link } from "wouter";
import { getEffectiveSetupTime } from "@/lib/shot-list";

function ShotCard({ shot, isAI }: { shot: any, isAI: boolean }) {
  return (
    <Card className="rounded-none border-2 overflow-hidden border-l-[6px] border-l-border hover:border-l-primary transition-colors flex flex-col h-full bg-card shadow-none">
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-4 border-b pb-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 shrink-0 bg-muted flex items-center justify-center font-serif text-xl font-bold border">
              {shot.shotNumber}
            </div>
            <div>
              <h4 className="font-bold font-serif text-lg leading-none">{shot.shotType}</h4>
              <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1.5 font-bold">{shot.framing} &bull; {shot.lens}</p>
            </div>
          </div>
          <Badge variant="outline" className={`text-[9px] uppercase tracking-widest font-bold rounded-none ${isAI ? 'bg-accent/10 text-accent-foreground border-accent' : 'bg-background'}`}>
            {shot.sourceType}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-sans mb-4 flex-1">
          <div><span className="text-[9px] font-mono uppercase tracking-widest font-bold text-muted-foreground block mb-0.5">Angle</span> {shot.angle}</div>
          <div><span className="text-[9px] font-mono uppercase tracking-widest font-bold text-muted-foreground block mb-0.5">Movement</span> {shot.movement}</div>
          <div className="col-span-2"><span className="text-[9px] font-mono uppercase tracking-widest font-bold text-muted-foreground block mb-0.5">Lighting & Comp</span> {shot.lighting} | {shot.composition}</div>
        </div>

        <div className="text-sm font-serif italic text-muted-foreground border-l-2 border-primary/30 pl-3 bg-primary/5 p-3 mb-4">
          "{shot.rationale}"
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-muted/30 p-3 border mt-auto">
          {isAI ? (
            <>
              <div className="flex flex-col"><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">TOOL</span> <span className="truncate">{shot.modelTool}</span></div>
              <div className="flex flex-col"><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">COST</span> <span className="truncate">{shot.computeGenerationCost}</span></div>
              <div className="flex flex-col"><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">ITER</span> <span className="truncate">{shot.promptIterationTime}</span></div>
              <div className="flex flex-col"><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">CONSISTENCY</span> <span className="truncate">{shot.consistencyAcrossShots}</span></div>
            </>
          ) : (
            <>
              <div className="col-span-2 flex flex-col"><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">GEAR</span> <span className="truncate text-primary">{shot.equipment?.join(", ") || "-"}</span></div>
              <div className="flex flex-col"><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">TIME</span> <span>{getEffectiveSetupTime(shot)}</span></div>
              <div className="flex flex-col"><span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">BUDGET</span> <span className="truncate">{shot.budgetImpact}</span></div>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function ShotLists() {
  const { data: projects, isLoading } = useListProjects();

  if (isLoading) return <AppLayout><div className="p-12 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;

  const hasContent = projects?.some(p => p.scenes && p.scenes.some(s => s.shots && s.shots.length > 0));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8 lg:p-12 pb-24 relative">
        <div className="mb-12 pt-4 border-b-2 pb-8">
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight mb-3">Master Archive</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-3">
            <span className="w-8 h-px bg-primary/50"></span>
            All Shots Across Productions
          </p>
        </div>

        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card/30 border border-border/50">
            <Layers className="w-16 h-16 text-muted-foreground/30 mb-6" />
            <h3 className="font-serif text-3xl mb-3">The archive is empty</h3>
            <p className="text-muted-foreground max-w-sm font-sans">Initialize a board and break down scenes to populate the master shot list.</p>
          </div>
        ) : (
          <div className="space-y-24">
            {projects?.map(project => {
              if (!project.scenes || project.scenes.length === 0) return null;
              const hasShots = project.scenes.some(s => s.shots && s.shots.length > 0);
              if (!hasShots) return null;

              return (
                <div key={project.id} className="space-y-8 relative">

                  <div className="sticky top-0 bg-background/95 backdrop-blur z-10 py-4 border-b-2 border-primary/20 mb-8 flex justify-between items-end">
                    <h2 className="font-serif text-4xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary flex items-center justify-center">
                        <Clapperboard className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <Link href={`/app/${project.id}`} className="hover:text-primary transition-colors hover:underline decoration-2 underline-offset-4">{project.title}</Link>
                    </h2>
                    <Badge variant="outline" className="hidden md:flex font-mono text-[9px] uppercase tracking-widest font-bold rounded-none bg-background">{project.projectType.replace('-', ' ')}</Badge>
                  </div>

                  <div className="space-y-16 pl-6 md:pl-8 border-l-[3px] border-border relative">
                    {project.scenes.sort((a,b) => a.sceneNumber - b.sceneNumber).map(scene => {
                      if (!scene.shots || scene.shots.length === 0) return null;
                      return (
                        <div key={scene.id} className="relative">
                          <div className="absolute -left-[27px] md:-left-[35px] top-1 w-4 h-4 bg-background border-4 border-primary rounded-full"></div>

                          <div className="flex items-center justify-between gap-4 mb-6">
                            <h3 className="font-mono text-sm uppercase tracking-widest font-bold flex items-center gap-3">
                              <span className="bg-foreground text-background px-2 py-1">SC {scene.sceneNumber}</span>
                              <Link href={`/app/${project.id}/scenes/${scene.id}`} className="hover:text-primary transition-colors flex items-center gap-2 group">
                                {scene.title}
                                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                              </Link>
                            </h3>
                            <button
                              type="button"
                              title="Download shot list"
                              className="border-2 border-border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                              onClick={() => {
                                const body = scene.shots.map((shot) => `${String(shot.shotNumber).padStart(2, "0")}  ${shot.shotType}\n${shot.framing} / ${shot.angle} / ${shot.lens} / ${shot.movement}\nLighting: ${shot.lighting}\nRationale: ${shot.rationale}\nSetup: ${getEffectiveSetupTime(shot)} · ${shot.budgetImpact}`).join("\n\n");
                                const blob = new Blob([`SHOTWISE — ${project.title} — ${scene.title}\n\n${body}`], { type: "text/plain" });
                                const url = URL.createObjectURL(blob);
                                const anchor = document.createElement("a");
                                anchor.href = url;
                                anchor.download = `shotwise-${project.id}-${scene.id}.txt`;
                                anchor.click();
                                URL.revokeObjectURL(url);
                              }}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {scene.shots.sort((a,b) => a.shotNumber - b.shotNumber).map(shot => (
                              <ShotCard key={shot.id} shot={shot} isAI={shot.sourceType === "ai-generated"} />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}