import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <AppLayout>
      <div className="min-h-full flex flex-col items-center justify-center p-8 text-center">
        <h1 className="font-serif text-6xl text-primary mb-4">404</h1>
        <p className="text-xl text-muted-foreground font-mono uppercase tracking-widest">Dead End</p>
        <Link href="/app" className="mt-8 text-sm text-foreground underline hover:text-primary transition-colors">Return to Projects</Link>
      </div>
    </AppLayout>
  )
}