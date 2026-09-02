import { AppLayout } from "@/components/layout/AppLayout";
import { useListProjects } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BookOpen, Film, Layers, PenTool, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function ProductionNotes() {
  const { data: projects, isLoading } = useListProjects();

  if (isLoading) return <AppLayout><div className="p-12 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;

  const hasNotes = projects?.some(p => p.overallNotes || (p.scenes && p.scenes.some(s => s.productionNotes)));

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-8 lg:p-12 pb-24 relative">
        <div className="mb-12 pt-4 border-b-2 pb-8">
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight mb-3">Directorial Log</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-3">
            <span className="w-8 h-px bg-primary/50"></span>
            Notes & Observations
          </p>
        </div>

        {!hasNotes ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-card/30 border border-border/50">
            <PenTool className="w-16 h-16 text-muted-foreground/30 mb-6" />
            <h3 className="font-serif text-3xl mb-3">No logs recorded</h3>
            <p className="text-muted-foreground max-w-sm font-sans">Notes added to production boards or specific scenes will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-20">
            {projects?.map(project => {
              const hasProjectNotes = !!project.overallNotes;
              const scenesWithNotes = (project.scenes || []).filter(s => !!s.productionNotes);

              if (!hasProjectNotes && scenesWithNotes.length === 0) return null;

              return (
                <div key={project.id} className="space-y-8">
                  <div className="flex items-center gap-4 border-b pb-4">
                    <div className="w-12 h-12 bg-primary flex items-center justify-center">
                      <Film className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h2 className="font-serif text-4xl">
                      <Link href={`/app/${project.id}`} className="hover:text-primary transition-colors hover:underline decoration-2 underline-offset-4">{project.title}</Link>
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {hasProjectNotes && (
                      <Card className={`rounded-none border-2 shadow-none overflow-hidden ${scenesWithNotes.length === 0 ? 'lg:col-span-3 max-w-4xl' : 'lg:col-span-1 bg-primary/5 border-primary/20 sticky top-8'}`}>
                        <CardHeader className="p-5 border-b bg-background/50">
                          <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center gap-2 text-primary">
                            <BookOpen className="w-4 h-4" /> Global Notes
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 font-serif text-lg leading-relaxed whitespace-pre-wrap">
                          {project.overallNotes}
                        </CardContent>
                      </Card>
                    )}

                    {scenesWithNotes.length > 0 && (
                      <div className={hasProjectNotes ? "lg:col-span-2 space-y-6" : "lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6"}>
                        {scenesWithNotes.sort((a,b) => a.sceneNumber - b.sceneNumber).map(scene => (
                          <Card key={scene.id} className="rounded-none border-2 border-l-[6px] border-l-border bg-card shadow-none hover:border-l-primary transition-colors group">
                            <CardHeader className="p-4 border-b bg-muted/20">
                              <CardTitle className="text-[10px] font-mono font-bold uppercase tracking-widest flex items-center justify-between text-muted-foreground group-hover:text-primary transition-colors">
                                <span className="flex items-center gap-2">
                                  <Layers className="w-4 h-4" />
                                  <Link href={`/app/${project.id}/scenes/${scene.id}`} className="hover:underline flex items-center gap-2">
                                    <span className="bg-foreground text-background px-1.5 py-0.5">SC {scene.sceneNumber}</span>
                                    {scene.title}
                                  </Link>
                                </span>
                                <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 font-serif italic text-base leading-relaxed whitespace-pre-wrap text-foreground/90">
                              "{scene.productionNotes}"
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
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