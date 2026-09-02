import { AppLayout } from "@/components/layout/AppLayout";
import SceneRoom from "@/pages/SceneRoom";
import { useRoute } from "wouter";

// We'll rename the inline export to prevent collision and use this as a wrapper if needed
// Actually, I can just write SceneRoom.tsx to export the component directly.
// AppLayout wraps SceneRoom directly in App.tsx or we wrap it here.
