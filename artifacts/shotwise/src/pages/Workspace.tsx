import { AppLayout } from "@/components/layout/AppLayout";
import ProjectLibrary from "@/pages/ProjectLibrary";
import ProjectOverview from "@/pages/ProjectOverview";
import { useRoute } from "wouter";

export default function Workspace() {
  const [match, params] = useRoute("/app/:projectId");
  const projectId = params?.projectId;

  return (
    <AppLayout>
      {match && projectId ? (
        <ProjectOverview projectId={projectId} />
      ) : (
        <ProjectLibrary />
      )}
    </AppLayout>
  );
}
