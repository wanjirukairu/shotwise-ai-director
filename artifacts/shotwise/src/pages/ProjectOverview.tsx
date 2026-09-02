import { useGetProject, useUpdateProject, useCreateScene, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, Plus, PenTool, Lock, Unlock, FileText, Clapperboard, CheckCircle2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function ProjectOverview({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useGetProject(projectId, { query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) } });
  const updateProject = useUpdateProject();
  const createScene = useCreateScene();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [isSceneOpen, setIsSceneOpen] = useState(false);
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneNumber, setSceneNumber] = useState(1);
  const [sceneText, setSceneText] = useState("");

  const [notes, setNotes] = useState("");
  const notesRef = useRef(notes);

  useEffect(() => {
    if (project) {
      setNotes(project.overallNotes || "");
      notesRef.current = project.overallNotes || "";

      // Auto-suggest next scene number if not modified manually recently
      if (!isSceneOpen && project.scenes && project.scenes.length > 0) {
        const highest = Math.max(...project.scenes.map(s => s.sceneNumber));
        setSceneNumber(highest + 1);
      }
    }
  }, [project?.id, project?.scenes?.length]);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
  };

  const handleNotesBlur = () => {
    if (notes !== notesRef.current) {
      updateProject.mutate({ projectId, data: { overallNotes: notes } }, {
        onSuccess: (data) => {
          notesRef.current = data.overallNotes;
          queryClient.setQueryData(getGetProjectQueryKey(projectId), (old: any) => old ? { ...old, overallNotes: data.overallNotes } : old);
        }
      });
    }
  };

  const handleCreateScene = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneTitle || !sceneText) return;
    createScene.mutate({ projectId, data: { title: sceneTitle, sceneNumber, sceneText } }, {
      onSuccess: (scene) => {
        queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
        setIsSceneOpen(false);
        setSceneTitle("");
        setSceneText("");
        setLocation(`/app/${projectId}/scenes/${scene.id}`);
      }
    });
  };

  if (isLoading) return <div className="p-12 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!project) return <div className="p-12 flex flex-col items-center justify-center h-full font-serif text-2xl text-muted-foreground">Board missing or archived</div>;

  const completionPct = project.totalSceneCount > 0
    ? Math.round((project.completedSceneCount / project.totalSceneCount) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto p-8 lg:p-12 pb-24 relative">
      <div className="mb-12 pt-4 border-b-2 pb-8">
        <Link href="/app" className="inline-flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors mb-8 bg-muted/30 px-3 py-1.5 rounded-sm">
          <ChevronLeft className="w-3 h-3" /> Master Slate
        </Link>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4 font-mono text-[9px] uppercase tracking-widest rounded-none bg-background">{project.projectType.replace('-', ' ')}</Badge>
            <h1 className="font-serif text-5xl md:text-7xl tracking-tight leading-[0.9] mb-6">{project.title}</h1>

            <div className="flex flex-wrap gap-x-12 gap-y-4 text-xs font-mono bg-card inline-flex p-4 border rounded-none">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Total Scenes</span>
                <span className="text-xl leading-none">{project.totalSceneCount}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Locked</span>
                <span className="text-xl leading-none text-primary">{project.completedSceneCount}</span>
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold flex justify-between">
                  <span>Progress</span>
                  <span>{completionPct}%</span>
                </span>
                <div className="h-1.5 w-full bg-muted mt-2">
                  <div className="h-full bg-primary" style={{ width: `${completionPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <Dialog open={isSceneOpen} onOpenChange={setIsSceneOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 font-mono uppercase tracking-wider text-xs rounded-none h-14 px-8 shrink-0">
                <Plus className="w-4 h-4" /> Strip Scene
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl rounded-none border-t-4 border-t-primary">
              <DialogHeader>
                <DialogTitle className="font-serif text-3xl">Scene Strip</DialogTitle>
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Break down script text into a manageable unit</p>
              </DialogHeader>
              <form onSubmit={handleCreateScene} className="space-y-6 pt-6">
                <div className="grid grid-cols-4 gap-6">
                  <div className="col-span-1 space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Scene #</label>
                    <Input type="number" min="1" value={sceneNumber} onChange={e => setSceneNumber(parseInt(e.target.value))} className="rounded-none h-12 text-center font-mono text-lg border-2 focus-visible:ring-0 focus-visible:border-primary" />
                  </div>
                  <div className="col-span-3 space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Heading</label>
                    <Input value={sceneTitle} onChange={e => setSceneTitle(e.target.value)} placeholder="INT. LOBBY - DAY" className="rounded-none h-12 font-mono text-lg border-2 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/30 uppercase" autoFocus />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end">
                    <label className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Scene Text (Action/Dialogue)</label>
                    <span className="text-[9px] font-mono text-muted-foreground">Paste from Final Draft/Fade In</span>
                  </div>
                  <Textarea value={sceneText} onChange={e => setSceneText(e.target.value)} placeholder="The elevator doors open. GUSTAVE (50s) steps out, impeccably dressed..." className="min-h-[250px] rounded-none border-2 focus-visible:ring-0 focus-visible:border-primary font-mono text-sm leading-relaxed p-4" />
                </div>
                <Button type="submit" className="w-full rounded-none h-12 font-mono uppercase tracking-wider text-xs" disabled={createScene.isPending || !sceneTitle || !sceneText}>
                  {createScene.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processing...</> : "Commit Scene"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-serif text-3xl flex items-center gap-3">
              <Clapperboard className="w-6 h-6 text-primary" />
              Scene Strips
            </h2>
          </div>

          {project.scenes?.length === 0 ? (
            <div className="p-16 text-center border border-dashed border-border bg-card/30">
              <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-serif text-2xl mb-2">The board is clear</p>
              <p className="text-muted-foreground font-sans text-sm">Strip the first scene from the script to begin the directorial breakdown process.</p>
            </div>
          ) : (
            <div className="space-y-3 relative">
              <div className="absolute top-0 bottom-0 left-[2.25rem] w-px bg-border/50 -z-10 hidden sm:block"></div>

              {project.scenes?.sort((a,b) => a.sceneNumber - b.sceneNumber).map(scene => (
                <Link key={scene.id} href={`/app/${projectId}/scenes/${scene.id}`} className="block group">
                  <Card className="rounded-none transition-all hover:border-primary bg-card/90 shadow-none border hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))] hover:-translate-y-[2px] hover:-translate-x-[2px]">
                    <div className="flex flex-col sm:flex-row items-stretch">

                      <div className={`sm:w-20 flex sm:flex-col items-center sm:justify-center p-3 sm:border-r border-b sm:border-b-0 font-mono transition-colors ${scene.locked ? 'bg-primary/5 border-r-primary/20 text-primary' : 'bg-muted/30 text-muted-foreground group-hover:bg-primary/5'}`}>
                        <span className="text-[9px] font-bold uppercase tracking-widest mr-2 sm:mr-0">SC</span>
                        <span className="text-2xl font-bold leading-none mt-0 sm:mt-1">{scene.sceneNumber}</span>
                      </div>

                      <div className="flex-1 p-5 flex flex-col justify-center">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <h3 className="font-bold font-mono text-base uppercase tracking-tight group-hover:text-primary transition-colors">{scene.title}</h3>
                            <p className="text-sm text-muted-foreground font-sans line-clamp-1 mt-1.5 opacity-80">{scene.sceneText}</p>
                          </div>

                          {scene.locked ? (
                            <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                          ) : scene.readyToLock ? (
                            <Unlock className="w-5 h-5 text-accent shrink-0" />
                          ) : (
                            <ChevronLeft className="w-5 h-5 rotate-180 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mt-4 pt-4 border-t border-border/50">
                          <span className="flex items-center gap-1.5 text-foreground/70">
                            <FileText className="w-3.5 h-3.5" />
                            {scene.shots?.length || 0} Shots
                          </span>

                          {scene.locked && <span className="flex items-center gap-1.5 text-primary"><Lock className="w-3.5 h-3.5" /> Locked</span>}
                          {!scene.locked && scene.readyToLock && <span className="flex items-center gap-1.5 text-accent"><Unlock className="w-3.5 h-3.5" /> Ready for Lock</span>}

                          {scene.productionNotes && <span className="flex items-center gap-1.5"><PenTool className="w-3.5 h-3.5" /> Has Notes</span>}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="sticky top-8">
            <h2 className="font-serif text-3xl flex items-center gap-3 mb-6">
              <PenTool className="w-5 h-5 text-primary" />
              Director's Log
            </h2>
            <Card className="rounded-none border-2 shadow-none overflow-hidden group focus-within:border-primary transition-colors">
              <div className="bg-muted/40 p-3 border-b flex justify-between items-center">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Global Project Notes</span>
                <span className="text-[9px] font-mono text-muted-foreground opacity-0 group-focus-within:opacity-100 transition-opacity">Auto-saving</span>
              </div>
              <CardContent className="p-0">
                <Textarea
                  value={notes}
                  onChange={handleNotesChange}
                  onBlur={handleNotesBlur}
                  placeholder="Capture overarching themes, visual rules, character arcs, or technical constraints for the entire production here..."
                  className="min-h-[500px] border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent resize-y p-6 font-serif text-lg leading-relaxed placeholder:font-sans placeholder:text-sm placeholder:text-muted-foreground/50"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Temporary placeholder for missing icon in import
function Layers(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 12 12 17 22 12"/><polyline points="2 17 12 22 22 17"/></svg>;
}