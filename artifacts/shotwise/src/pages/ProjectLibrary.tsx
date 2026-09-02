import { useListProjects, useCreateProject, getListProjectsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Film, Clapperboard, Plus, Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { ProjectCreateProjectType } from "@workspace/api-client-react";

export default function ProjectLibrary() {
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ProjectCreateProjectType>("live-action");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    createProject.mutate({ data: { title, projectType: type } }, {
      onSuccess: (project) => {
        queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsOpen(false);
        setLocation(`/app/${project.id}`);
      }
    });
  };

  if (isLoading) return <div className="p-12 flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-7xl mx-auto p-8 lg:p-12 pb-24 relative">

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16 pt-8">
        <div>
          <h1 className="font-serif text-6xl tracking-tight mb-3">Master Slate</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest font-medium flex items-center gap-3">
            <span className="w-8 h-px bg-primary/50"></span>
            Active Productions
          </p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 font-mono uppercase tracking-wider text-xs rounded-none h-14 px-8 shadow-none border-b-4 border-b-black/20 hover:translate-y-[1px] hover:border-b-[3px] transition-all">
              <Plus className="w-4 h-4" /> Initialize Board
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-none border-t-4 border-t-primary">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl">New Production Board</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-6 pt-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Working Title</label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. The Grand Budapest Hotel"
                  autoFocus
                  className="rounded-none h-12 text-lg border-2 focus-visible:ring-0 focus-visible:border-primary placeholder:font-serif placeholder:italic"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Format Focus</label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as ProjectCreateProjectType)}
                  className="flex h-12 w-full rounded-none border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:border-primary font-mono cursor-pointer"
                >
                  <option value="live-action">Live Action (Practical Focus)</option>
                  <option value="ai-generated">AI Generated (Synthetic Focus)</option>
                  <option value="music-video">Music Video (Tempo Sync)</option>
                  <option value="documentary">Documentary (Coverage Focus)</option>
                  <option value="hybrid">Hybrid (Mixed Media)</option>
                </select>
              </div>
              <Button type="submit" className="w-full rounded-none h-12 font-mono uppercase tracking-wider text-xs" disabled={createProject.isPending}>
                {createProject.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Initializing...</>
                ) : "Create Board"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {projects?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center bg-card/30 border border-border/50">
          <Film className="w-16 h-16 text-muted-foreground/30 mb-6" />
          <h3 className="font-serif text-3xl mb-3">The slate is empty</h3>
          <p className="text-muted-foreground max-w-sm mb-8 font-sans">Initialize a production board to begin breaking down scenes, shots, and scheduling logic.</p>
          <Button onClick={() => setIsOpen(true)} variant="outline" className="rounded-none font-mono uppercase tracking-widest text-[10px] h-10">
            Initialize First Board
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects?.map(project => {
            const completionPct = project.totalSceneCount > 0
              ? Math.round((project.completedSceneCount / project.totalSceneCount) * 100)
              : 0;

            return (
              <Link key={project.id} href={`/app/${project.id}`} className="block group h-full">
                <Card className="h-full flex flex-col rounded-none transition-all duration-300 border-2 hover:border-primary bg-card/80 backdrop-blur group-hover:shadow-[4px_4px_0px_0px_hsl(var(--primary))] hover:-translate-y-1 hover:-translate-x-1">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start mb-6">
                      <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-widest rounded-none bg-background">{project.projectType.replace('-', ' ')}</Badge>
                      <Clapperboard className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </div>
                    <CardTitle className="font-serif text-2xl line-clamp-2 leading-tight group-hover:text-primary transition-colors">{project.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <div className="space-y-4">
                      <div className="flex items-end justify-between font-mono">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Lock Status</span>
                          <span className="text-lg leading-none mt-1">
                            {project.completedSceneCount} <span className="text-muted-foreground/50 text-sm">/ {project.totalSceneCount}</span>
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-primary">{completionPct}%</span>
                      </div>
                      <div className="h-1 w-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-1000 ease-out"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-4 pt-4 border-t bg-muted/20 flex justify-between items-center text-xs font-mono uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                    <span>Open Board</span>
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-primary" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}