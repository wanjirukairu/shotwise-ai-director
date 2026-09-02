import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import {
  Clapperboard, Target, MessageSquare, Plus, PanelLeft, PanelRight, Film, Settings2
} from 'lucide-react';
import { useClerk, useUser } from '@clerk/react';
import { useListProjects } from '@workspace/api-client-react';

export function LogoMark() {
  return (
    <div className="relative flex h-8 w-8 items-center justify-center rounded-[9px] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_5px_12px_hsl(var(--primary)/.28)]" aria-hidden="true">
      <Film size={16} strokeWidth={2.4} />
      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full border-2 border-[hsl(var(--sidebar))] bg-[hsl(var(--accent))]" />
    </div>
  );
}

export function Sidebar({ collapsed, onCollapse }: { collapsed: boolean; onCollapse: () => void }) {
  const [location, setLocation] = useLocation();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { signOut } = useClerk();
  const { user } = useUser();

  const { data: projects } = useListProjects();

  const activeProjectId = location.startsWith('/app/') ? location.split('/')[2] : null;

  const navigateToNew = () => {
    setLocation('/app');
  };

  return (
    <aside className={`flex shrink-0 flex-col bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-[width] duration-300 ${collapsed ? 'w-[72px]' : 'w-[250px]'}`}>
      <div className={`flex h-[76px] items-center border-b border-[hsl(var(--sidebar-border))] ${collapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
        <Link href="/app" className="flex items-center gap-3 overflow-hidden cursor-pointer hover:opacity-90">
          <LogoMark />
          {!collapsed && <span className="font-display whitespace-nowrap text-[25px] tracking-[-.02em]">ShotWise</span>}
        </Link>
        <button className="hidden rounded-md p-1.5 text-[hsl(var(--sidebar-foreground)/.55)] transition-colors hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))] md:block" onClick={onCollapse} aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} data-testid="button-toggle-sidebar">
          {collapsed ? <PanelRight size={16} /> : <PanelLeft size={16} />}
        </button>
      </div>
      <div className={`border-b border-[hsl(var(--sidebar-border))] py-5 ${collapsed ? 'px-3' : 'px-4'}`}>
        <button className={`flex w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--sidebar-primary))] py-2.5 text-sm font-semibold text-[hsl(var(--sidebar-primary-foreground))] transition-transform hover:-translate-y-0.5 hover:shadow-[0_6px_18px_hsl(var(--sidebar-primary)/.2)] active:translate-y-0 ${collapsed ? 'px-0' : 'px-3'}`} onClick={navigateToNew} data-testid="button-new-scene">
          <Plus size={16} />
          {!collapsed && 'New scene'}
        </button>
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="mb-3 flex items-center justify-between px-1">
            <span className="font-mono-ui text-[10px] uppercase tracking-[.16em] text-[hsl(var(--sidebar-foreground)/.42)]">Workspace</span>
          </div>

          {/* Recent projects */}
          {projects && projects.length > 0 && (
            <div className="mb-6 space-y-1.5">
              {projects.slice(0, 5).map(p => (
                <Link key={p.id} href={`/app/${p.id}`} className={`block rounded-lg border p-3 transition-colors ${activeProjectId === p.id ? 'border-[hsl(var(--sidebar-primary)/.4)] bg-[hsl(var(--sidebar-accent)/.8)]' : 'border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.45)] hover:bg-[hsl(var(--sidebar-accent)/.6)]'}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${activeProjectId === p.id ? 'bg-[hsl(var(--sidebar-primary))]' : 'bg-[hsl(var(--sidebar-foreground)/.3)]'}`} />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-[hsl(var(--sidebar-foreground))]">{p.title || 'Untitled scene'}</p>
                      <p className="mt-1 font-mono-ui text-[10px] text-[hsl(var(--sidebar-foreground)/.46)]">{p.completedSceneCount}/{p.totalSceneCount} scenes locked · {new Date(p.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-2 space-y-1">
            <Link href="/app" className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-[13px] transition-colors ${location === '/app' || location.startsWith('/app/') ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.55)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`}>
              <Clapperboard size={15} />
              Scenes
            </Link>
            <Link href="/shot-lists" className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-[13px] transition-colors ${location === '/shot-lists' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.55)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`}>
              <Target size={15} />
              Shot lists
            </Link>
            <Link href="/production-notes" className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-[13px] transition-colors ${location === '/production-notes' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.55)] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]'}`}>
              <MessageSquare size={15} />
              Production notes
            </Link>
          </div>
        </div>
      )}
      <div className={`border-t border-[hsl(var(--sidebar-border))] py-4 ${collapsed ? 'px-3' : 'px-4'}`}>
        {!collapsed && (
          <div className="mb-4 flex items-center gap-2.5 px-2">
            <div className="h-6 w-6 rounded-full bg-[hsl(var(--sidebar-accent))] overflow-hidden flex items-center justify-center text-[9px] font-bold text-[hsl(var(--sidebar-foreground))]">
              {user?.firstName?.charAt(0) || user?.primaryEmailAddress?.emailAddress?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-[11px] font-medium leading-none">{user?.fullName || user?.primaryEmailAddress?.emailAddress}</p>
            </div>
            <button onClick={() => signOut()} className="text-[10px] text-[hsl(var(--sidebar-foreground)/.5)] hover:text-[hsl(var(--sidebar-foreground))] transition-colors" title="Log out">
              Log out
            </button>
          </div>
        )}
        {collapsed && (
          <button onClick={() => signOut()} className="flex w-full items-center justify-center rounded-md py-2 text-[hsl(var(--sidebar-foreground)/.55)] hover:text-[hsl(var(--sidebar-foreground))] transition-colors" title="Log out">
            <div className="h-6 w-6 rounded-full bg-[hsl(var(--sidebar-accent))] flex items-center justify-center text-[9px] font-bold">
              {user?.firstName?.charAt(0) || 'U'}
            </div>
          </button>
        )}
      </div>
    </aside>
  );
}