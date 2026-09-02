import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, projectsTable, scenesTable } from "@workspace/db";
import {
  CreateProjectBody,
  CreateSceneBody,
  CreateSceneParams,
  GetProjectParams,
  GetSceneParams,
  UpdateProjectBody,
  UpdateProjectParams,
  UpdateSceneBody,
  UpdateSceneParams,
} from "@workspace/api-zod";
import { getUserId } from "../lib/auth";
import { normalizeSetupTimeOverride } from "./setup-time-overrides";

const router: IRouter = Router();

const DEFAULT_CRAFT_RESOURCES = [
  { title: "ARRI filmmaker interviews and technical talks", kind: "Cinematographer interviews", url: "https://www.youtube.com/@ARRIChannel" },
  { title: "Cooke Optics cinematography conversations", kind: "Cinematographer interviews", url: "https://www.youtube.com/@cookeoptics" },
  { title: "BAFTA filmmaking masterclasses and interviews", kind: "Filmmaker interviews", url: "https://www.youtube.com/@BAFTA" },
  { title: "Criterion Collection essays and interviews", kind: "Articles and interviews", url: "https://www.criterion.com/current" },
];

function legacyReference(shot: Record<string, unknown>) {
  const framing = String(shot.framing ?? "").toLowerCase();
  const movement = String(shot.movement ?? "").toLowerCase();
  if (movement.includes("handheld")) return { title: "Documentary-style handheld urgency", work: "The Battle of Algiers", medium: "film", technique: "Study how unstable observational movement can increase immediacy without losing subject geography.", url: null };
  if (movement.includes("push") || movement.includes("dolly")) return { title: "Motivated push-in", work: "Jaws", medium: "film", technique: "Study how a controlled change in camera distance can turn realization into a physical audience experience.", url: null };
  if (framing.includes("close")) return { title: "Expressive close-up", work: "The Passion of Joan of Arc", medium: "film", technique: "Study how close framing and withheld environment can concentrate attention on small emotional changes.", url: null };
  return { title: "Static ensemble framing", work: "Tokyo Story", medium: "film", technique: "Study how a patient, stable frame lets blocking and eyelines carry the dramatic emphasis.", url: null };
}

function normalizeShots(shots: Array<Record<string, unknown>>, projectType = "live-action") {
  return shots.map((shot) => ({
    ...shot,
    setupTimeOverride: normalizeSetupTimeOverride(shot.setupTimeOverride),
    sourceType:
      shot.sourceType ??
      (projectType === "ai-generated" ? "ai-generated" : "practical"),
    computeGenerationCost: shot.computeGenerationCost ?? null,
    modelTool: shot.modelTool ?? null,
    promptIterationTime: shot.promptIterationTime ?? null,
    consistencyAcrossShots: shot.consistencyAcrossShots ?? null,
    upscalingPostNeeds: shot.upscalingPostNeeds ?? null,
    referenceExamples: Array.isArray(shot.referenceExamples) && shot.referenceExamples.length ? shot.referenceExamples : [legacyReference(shot)],
    learningResources: Array.isArray(shot.learningResources) && shot.learningResources.length ? shot.learningResources : DEFAULT_CRAFT_RESOURCES,
  }));
}

function sceneResponse(scene: typeof scenesTable.$inferSelect, projectType = "live-action") {
  return {
    ...scene,
    shots: normalizeShots(scene.shots as unknown as Array<Record<string, unknown>>, projectType),
    createdAt: scene.createdAt.toISOString(),
    updatedAt: scene.updatedAt.toISOString(),
  };
}

async function projectResponse(project: typeof projectsTable.$inferSelect) {
  let scenes = await db
    .select()
    .from(scenesTable)
    .where(eq(scenesTable.projectId, project.id))
    .orderBy(asc(scenesTable.sceneNumber));

  if (scenes.length === 0 && (project.sceneText || project.shots.length > 0)) {
    const [legacyScene] = await db
      .insert(scenesTable)
      .values({
        projectId: project.id,
        userId: project.userId,
        title: project.title,
        sceneNumber: 1,
        sceneText: project.sceneText,
        resources: project.resources,
        budget: project.budget,
        equipment: project.equipment,
        crewExperience: project.crewExperience,
        messages: project.messages,
        shots: normalizeShots(
          project.shots as unknown as Array<Record<string, unknown>>,
          project.projectType,
        ) as typeof project.shots,
        productionNotes: project.productionNotes,
        readyToLock: project.readyToLock,
        locked: project.locked,
      })
      .returning();
    scenes = [legacyScene];
  }

  return {
    id: project.id,
    title: project.title,
    projectType: project.projectType,
    overallNotes: project.overallNotes,
    scenes: scenes.map((scene) => sceneResponse(scene, project.projectType)),
    totalSceneCount: scenes.length,
    completedSceneCount: scenes.filter((scene) => scene.locked).length,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

router.get("/projects", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  const projects = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.userId, userId))
    .orderBy(desc(projectsTable.updatedAt));
  res.json(await Promise.all(projects.map(projectResponse)));
});

router.post("/projects", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  const body = CreateProjectBody.safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: "Invalid project" });
  const [project] = await db
    .insert(projectsTable)
    .values({
      userId,
      title: body.data.title,
      projectType: body.data.projectType,
      sceneText: "",
    })
    .returning();
  res.json(await projectResponse(project));
});

router.get("/projects/:projectId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetProjectParams.safeParse(req.params);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  if (!params.success) return void res.status(400).json({ error: "Invalid project" });
  const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) return void res.status(404).json({ error: "Project not found" });
  res.json(await projectResponse(project));
});

router.patch("/projects/:projectId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateProjectParams.safeParse(req.params);
  const body = UpdateProjectBody.safeParse(req.body);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  if (!params.success || !body.success) return void res.status(400).json({ error: "Invalid project update" });
  const { title, projectType, overallNotes } = body.data;
  const [project] = await db.update(projectsTable).set({
    ...(title !== undefined ? { title } : {}),
    ...(projectType !== undefined ? { projectType } : {}),
    ...(overallNotes !== undefined ? { overallNotes } : {}),
    updatedAt: new Date(),
  }).where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId))).returning();
  if (!project) return void res.status(404).json({ error: "Project not found" });
  res.json(await projectResponse(project));
});

router.get("/projects/:projectId/scenes", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateSceneParams.safeParse(req.params);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  if (!params.success) return void res.status(400).json({ error: "Invalid project" });
  const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) return void res.status(404).json({ error: "Project not found" });
  const payload = await projectResponse(project);
  res.json(payload.scenes);
});

router.post("/projects/:projectId/scenes", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = CreateSceneParams.safeParse(req.params);
  const body = CreateSceneBody.safeParse(req.body);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  if (!params.success || !body.success) return void res.status(400).json({ error: "Invalid scene" });
  const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) return void res.status(404).json({ error: "Project not found" });
  const [scene] = await db.insert(scenesTable).values({
    projectId: project.id,
    userId,
    title: body.data.title,
    sceneNumber: body.data.sceneNumber,
    sceneText: body.data.sceneText,
  }).returning();
  await db.update(projectsTable).set({ updatedAt: new Date() }).where(eq(projectsTable.id, project.id));
  res.json(sceneResponse(scene, project.projectType));
});

router.get("/projects/:projectId/scenes/:sceneId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = GetSceneParams.safeParse(req.params);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  if (!params.success) return void res.status(400).json({ error: "Invalid scene" });
  const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  const [scene] = await db.select().from(scenesTable).where(and(eq(scenesTable.id, params.data.sceneId), eq(scenesTable.projectId, params.data.projectId), eq(scenesTable.userId, userId)));
  if (!project || !scene) return void res.status(404).json({ error: "Scene not found" });
  res.json(sceneResponse(scene, project.projectType));
});

router.patch("/projects/:projectId/scenes/:sceneId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateSceneParams.safeParse(req.params);
  const body = UpdateSceneBody.safeParse(req.body);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  if (!params.success || !body.success) return void res.status(400).json({ error: "Invalid scene update" });
  const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, params.data.projectId), eq(projectsTable.userId, userId)));
  if (!project) return void res.status(404).json({ error: "Project not found" });
  const [scene] = await db.update(scenesTable).set({ ...body.data, updatedAt: new Date() }).where(and(eq(scenesTable.id, params.data.sceneId), eq(scenesTable.projectId, params.data.projectId), eq(scenesTable.userId, userId))).returning();
  if (!scene) return void res.status(404).json({ error: "Scene not found" });
  await db.update(projectsTable).set({ updatedAt: new Date() }).where(eq(projectsTable.id, project.id));
  res.json(sceneResponse(scene, project.projectType));
});

export default router;
