import { AppLayout } from "@/components/layout/AppLayout";
import { Link } from "wouter";

export default function Landing() {
  return (
    <AppLayout>
      <div className="min-h-full flex flex-col items-center justify-center text-center p-8">
        <h1 className="font-serif text-6xl md:text-8xl text-primary mb-6 tracking-tight">ShotWise</h1>
        <p className="text-xl md:text-2xl text-muted-foreground font-mono max-w-2xl uppercase tracking-widest leading-relaxed">
          The Director's Command Center for Modern Film Production
        </p>
        <div className="mt-12">
          <Link href="/sign-in" className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            Enter the Room
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
