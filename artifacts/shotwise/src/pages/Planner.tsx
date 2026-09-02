import { AppLayout } from "@/components/layout/AppLayout";
import { useListShootDays, useCreateShootDay, useUpdateShootDay, getListShootDaysQueryKey, useListProjects, ShootDayShot } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Calendar as CalendarIcon, Clock, CheckCircle2, ChevronUp, ChevronDown, Trash2, ChevronRight, X, Layers, Flag } from "lucide-react";
import { useState } from "react";
import { getEffectiveSetupTime } from "@/lib/shot-list";

export default function Planner() {
  const { data: shootDays, isLoading } = useListShootDays();
  const { data: projects } = useListProjects();

  const createShootDay = useCreateShootDay();
  const updateShootDay = useUpdateShootDay();
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const selectedDay = shootDays?.find(d => d.id === selectedDayId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    createShootDay.mutate({ data: { title, shootDate: date || null } }, {
      onSuccess: (newDay) => {
        queryClient.invalidateQueries({ queryKey: getListShootDaysQueryKey() });
        setIsOpen(false);
        setTitle("");
        setDate("");
        setSelectedDayId(newDay.id);
      }
    });
  };

  const getShotDetails = (shotRef: ShootDayShot) => {
    const project = projects?.find(p => p.id === shotRef.projectId);
    const scene = project?.scenes?.find(s => s.id === shotRef.sceneId);
    const shot = scene?.shots?.find(s => s.id === shotRef.shotId);
    return { project, scene, shot };
  };

  const moveShot = (index: number, direction: -1 | 1) => {
    if (!selectedDay) return;
    const newShots = [...(selectedDay.shots || [])];
    const target = index + direction;
    if (target < 0 || target >= newShots.length) return;

    const temp = newShots[index];
    newShots[index] = newShots[target];
    newShots[target] = temp;
    newShots.forEach((s, i) => s.position = i);

    updateShootDay.mutate({ shootDayId: selectedDay.id, data: { shots: newShots } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShootDaysQueryKey() })
    });
  };

  const removeShot = (index: number) => {
    if (!selectedDay) return;
    const newShots = (selectedDay.shots || []).filter((_, i) => i !== index);
    newShots.forEach((s, i) => s.position = i);

    updateShootDay.mutate({ shootDayId: selectedDay.id, data: { shots: newShots } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShootDaysQueryKey() })
    });
  };

  const addShot = (projectId: string, sceneId: string, shot: any) => {
    if (!selectedDay) return;
    const newShot: ShootDayShot = {
      id: Math.random().toString(36).substring(2, 9),
      projectId,
      sceneId,
      shotId: shot.id,
      position: selectedDay.shots?.length || 0,
      status: "pending",
      plannedSetupTime: getEffectiveSetupTime(shot) || null,
    };
    const newShots = [...(selectedDay.shots || []), newShot];

    updateShootDay.mutate({ shootDayId: selectedDay.id, data: { shots: newShots } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShootDaysQueryKey() })
    });
  };

  const toggleDayStatus = () => {
    if (!selectedDay) return;
    const newStatus = selectedDay.status === "completed" ? "draft" : "completed";
    updateShootDay.mutate({ shootDayId: selectedDay.id, data: { status: newStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListShootDaysQueryKey() })
    });
  };

  if (isLoading) return <AppLayout><div className="p-12 flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></AppLayout>;

  // Check if we need to auto-select a day
  if (shootDays && shootDays.length > 0 && !selectedDayId) {
    setSelectedDayId(shootDays[0].id);
  }

  return (
    <AppLayout>
      <div className="flex flex-col lg:flex-row h-full">
        {/* Left Column: List of Days */}
        <div className="w-full lg:w-[380px] shrink-0 bg-background border-b lg:border-b-0 lg:border-r border-border overflow-y-auto z-10 shadow-[4px_0px_24px_rgba(0,0,0,0.05)] relative flex flex-col">
          <div className="p-6 pb-4 sticky top-0 bg-background/95 backdrop-blur z-20 border-b">
            <h1 className="font-serif text-4xl tracking-tight mb-2">Logistics</h1>
            <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
              <span className="w-4 h-px bg-primary/50"></span>
              Shoot Schedule
            </p>
          </div>

          <div className="p-6 pb-0">
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="w-full mb-6 gap-2 font-mono uppercase tracking-wider text-xs rounded-none h-12 shadow-none border-b-4 border-b-black/20 hover:translate-y-[1px] hover:border-b-[3px] transition-all">
                  <Plus className="w-4 h-4" /> Add Call Sheet
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-none border-t-4 border-t-primary">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">New Shoot Day</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Unit Designation</label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Day 1: Main Lobby" autoFocus className="rounded-none h-12 border-2 focus-visible:ring-0 focus-visible:border-primary font-mono" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground">Target Date (Optional)</label>
                    <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-none h-12 border-2 focus-visible:ring-0 focus-visible:border-primary font-mono cursor-pointer" />
                  </div>
                  <Button type="submit" className="w-full rounded-none h-12 font-mono uppercase tracking-wider text-xs" disabled={createShootDay.isPending}>
                    {createShootDay.isPending ? "Configuring..." : "Establish Call Sheet"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex-1 p-6 space-y-3">
            {shootDays?.map(day => (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={`w-full text-left p-5 border-2 transition-all relative overflow-hidden group ${
                  selectedDayId === day.id
                    ? 'bg-card border-primary shadow-[4px_4px_0px_0px_hsl(var(--primary))] -translate-y-1 -translate-x-1 z-10'
                    : 'bg-card/50 border-border hover:border-primary/50'
                }`}
              >
                {day.status === "completed" && (
                  <div className="absolute top-0 right-0 w-0 h-0 border-t-[30px] border-l-[30px] border-t-accent border-l-transparent">
                    <CheckCircle2 className="w-3 h-3 text-accent-foreground absolute -top-[25px] -left-[14px]" />
                  </div>
                )}

                <div className="flex justify-between items-start mb-3">
                  <span className={`font-mono text-[9px] font-bold uppercase tracking-widest px-2 py-1 ${selectedDayId === day.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {day.shootDate ? new Date(day.shootDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : "TBD"}
                  </span>
                </div>
                <h3 className={`font-serif text-xl leading-tight mb-2 ${selectedDayId === day.id ? 'text-primary' : ''}`}>{day.title}</h3>

                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest border-t pt-3 mt-3">
                  <span className={selectedDayId === day.id ? 'text-foreground font-bold' : 'text-muted-foreground'}>
                    {day.shots?.length || 0} Setups
                  </span>
                  {!day.shots?.length && (
                    <span className="text-primary opacity-0 group-hover:opacity-100 transition-opacity">Empty &rarr;</span>
                  )}
                </div>
              </button>
            ))}

            {shootDays?.length === 0 && (
              <div className="text-center p-12 border-2 border-dashed border-border/50 text-sm text-muted-foreground opacity-60 font-serif italic bg-card/30">
                No logistics planned yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Day Details */}
        <div className="flex-1 bg-muted/20 relative z-0 h-full overflow-y-auto">
          {!selectedDay ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-50 p-8">
              <CalendarIcon className="w-16 h-16 mb-6 opacity-20" />
              <h3 className="font-serif text-3xl mb-2">No Schedule Selected</h3>
              <p className="font-sans max-w-sm">Establish a call sheet to begin stripping boards and planning setups for production.</p>
            </div>
          ) : (
            <div className="min-h-full flex flex-col">
              <div className="sticky top-0 bg-background/95 backdrop-blur z-20 border-b px-8 py-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 shadow-sm">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-mono text-[10px] font-bold text-background bg-foreground px-2 py-1 uppercase tracking-widest">
                      {selectedDay.shootDate ? new Date(selectedDay.shootDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "Unscheduled Date"}
                    </span>
                    {selectedDay.status === "completed" && (
                      <span className="font-mono text-[10px] font-bold text-accent-foreground bg-accent px-2 py-1 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Wrap Called
                      </span>
                    )}
                  </div>
                  <h2 className="font-serif text-4xl md:text-5xl">{selectedDay.title}</h2>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Button
                    variant={selectedDay.status === "completed" ? "outline" : "default"}
                    className={`gap-2 font-mono uppercase tracking-wider text-[10px] font-bold rounded-none h-10 px-4 ${selectedDay.status === "completed" ? 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive' : 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-[2px_2px_0px_0px_hsl(var(--foreground))]'}`}
                    onClick={toggleDayStatus}
                  >
                    <Flag className="w-3 h-3" />
                    {selectedDay.status === "completed" ? "Re-open Call Sheet" : "Call Wrap on Unit"}
                  </Button>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2 font-mono uppercase tracking-wider text-[10px] font-bold rounded-none h-10 px-4 border-2 hover:border-primary hover:text-primary">
                        <Plus className="w-3 h-3" /> Strip Board
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col rounded-none p-0 border-2 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)]">
                      <div className="p-6 border-b bg-muted/30">
                        <DialogTitle className="font-serif text-3xl">Board Striping</DialogTitle>
                        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mt-2 font-bold">Pull setups from active productions onto the call sheet</p>
                      </div>

                      <div className="flex-1 overflow-y-auto bg-background p-6 space-y-10">
                        {projects?.length === 0 && (
                          <div className="text-center p-12 font-serif italic text-muted-foreground border-2 border-dashed">
                            No productions available. Initialize a project first.
                          </div>
                        )}

                        {projects?.map(project => {
                          const hasScenes = project.scenes && project.scenes.length > 0;
                          if (!hasScenes) return null;

                          return (
                            <div key={project.id} className="relative">
                              <h3 className="font-serif text-2xl border-b-2 border-primary/20 pb-2 mb-6 flex items-center gap-3 sticky top-0 bg-background py-2 z-10">
                                <div className="w-6 h-6 bg-primary flex items-center justify-center">
                                  <span className="w-2 h-2 bg-background rounded-full"></span>
                                </div>
                                {project.title}
                              </h3>
                              <div className="space-y-8 pl-4">
                                {project.scenes?.map(scene => {
                                  if (!scene.shots || scene.shots.length === 0) return null;
                                  return (
                                    <div key={scene.id} className="pl-4 border-l-2 border-border/50">
                                      <h4 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                        <Layers className="w-3 h-3" />
                                        SC {scene.sceneNumber}: {scene.title}
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {scene.shots.sort((a,b) => a.shotNumber - b.shotNumber).map(shot => {
                                          const isAdded = selectedDay.shots?.some(s => s.shotId === shot.id);
                                          return (
                                            <div key={shot.id} className={`flex items-center justify-between p-3 border-2 transition-colors ${isAdded ? 'bg-muted/50 border-border/50 opacity-60' : 'bg-card border-border hover:border-primary/50'}`}>
                                              <div className="flex-1 min-w-0 pr-3">
                                                <div className="font-bold font-serif text-lg leading-tight truncate mb-1">
                                                  {shot.shotNumber}. {shot.shotType}
                                                </div>
                                                <div className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest font-bold truncate">
                                                  {shot.framing} &middot; {shot.setupTimeOverride || shot.setupTime}
                                                </div>
                                              </div>
                                              <Button
                                                size="sm"
                                                variant={isAdded ? "ghost" : "outline"}
                                                disabled={isAdded}
                                                onClick={() => addShot(project.id, scene.id, shot)}
                                                className={`shrink-0 h-8 rounded-none font-mono uppercase tracking-widest text-[9px] font-bold ${!isAdded ? 'hover:bg-primary hover:text-primary-foreground hover:border-primary' : ''}`}
                                              >
                                                {isAdded ? "Slated" : "Add"}
                                              </Button>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="flex-1 p-8">
                <div className="max-w-5xl mx-auto space-y-4">
                  {(!selectedDay.shots || selectedDay.shots.length === 0) ? (
                    <div className="p-16 text-center border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center mt-12">
                      <Layers className="w-12 h-12 text-muted-foreground/30 mb-4" />
                      <p className="font-serif text-2xl mb-2">Call Sheet Empty</p>
                      <p className="text-muted-foreground font-sans text-sm max-w-sm">Strip setups from the production boards to begin building the logistical plan for this unit.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDay.shots.sort((a,b) => a.position - b.position).map((shotRef, index) => {
                        const { project, scene, shot } = getShotDetails(shotRef);
                        return (
                          <Card key={shotRef.id} className="rounded-none border-2 bg-card hover:border-primary/50 transition-colors shadow-none group overflow-hidden">
                            <div className="flex flex-col sm:flex-row">
                              <div className="flex sm:flex-col items-center justify-between sm:justify-center p-2 border-b sm:border-b-0 sm:border-r bg-muted/30 sm:w-16 shrink-0">
                                <button disabled={index === 0} onClick={() => moveShot(index, -1)} className="p-2 hover:text-primary hover:bg-background disabled:opacity-30 transition-colors">
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <span className="text-[10px] font-mono font-bold text-center my-2 bg-background px-2 py-1 border">{index + 1}</span>
                                <button disabled={index === selectedDay.shots.length - 1} onClick={() => moveShot(index, 1)} className="p-2 hover:text-primary hover:bg-background disabled:opacity-30 transition-colors">
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="p-4 sm:p-5 flex-1 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div className="flex-1 min-w-0 pr-4">
                                  <div className="flex items-center gap-2 mb-2 text-[9px] font-mono uppercase tracking-widest font-bold text-muted-foreground">
                                    <span className="text-primary truncate max-w-[120px]">{project?.title || "Unknown"}</span>
                                    <span className="text-border">/</span>
                                    <span className="whitespace-nowrap">SC {scene?.sceneNumber || "?"}</span>
                                  </div>
                                  <h4 className="font-bold font-serif text-xl sm:text-2xl leading-tight mb-2 truncate">
                                    {shot ? `${shot.shotNumber}. ${shot.shotType}` : "Unknown Shot"}
                                  </h4>
                                  {shot && (
                                    <p className="text-[10px] font-mono uppercase tracking-widest font-bold text-muted-foreground truncate">
                                      {shot.framing} &bull; {shot.lens} &bull; {shot.movement}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-6 sm:pl-4 sm:border-l shrink-0">
                                  <div className="text-left sm:text-right w-24">
                                    <div className="text-[9px] font-mono uppercase tracking-widest font-bold text-muted-foreground mb-1">Allocation</div>
                                    <div className="text-sm font-sans font-medium bg-muted/50 inline-block sm:block px-2 py-1">{shotRef.plannedSetupTime || "-"}</div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeShot(index)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-none h-10 w-10 border border-transparent hover:border-destructive/20"
                                    title="Remove from call sheet"
                                  >
                                    <X className="w-5 h-5" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
