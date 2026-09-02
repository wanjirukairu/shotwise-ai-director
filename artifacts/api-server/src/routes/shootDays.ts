import { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  projectsTable,
  scenesTable,
  shootDaysTable,
  shootDayShotsTable,
} from "@workspace/db";
import {
  CreateShootDayBody,
  UpdateShootDayBody,
  UpdateShootDayParams,
} from "@workspace/api-zod";
import { getUserId } from "../lib/auth";

const router: IRouter = Router();

async function dayResponse(day: typeof shootDaysTable.$inferSelect) {
  const shots = await db
    .select()
    .from(shootDayShotsTable)
    .where(eq(shootDayShotsTable.shootDayId, day.id))
    .orderBy(asc(shootDayShotsTable.position));
  return {
    ...day,
    shots,
    createdAt: day.createdAt.toISOString(),
    updatedAt: day.updatedAt.toISOString(),
  };
}

router.get("/shoot-days", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  const days = await db.select().from(shootDaysTable).where(eq(shootDaysTable.userId, userId)).orderBy(desc(shootDaysTable.updatedAt));
  res.json(await Promise.all(days.map(dayResponse)));
});

router.post("/shoot-days", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const body = CreateShootDayBody.safeParse(req.body);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  if (!body.success) return void res.status(400).json({ error: "Invalid shoot day" });
  const [day] = await db.insert(shootDaysTable).values({ userId, ...body.data }).returning();
  res.json(await dayResponse(day));
});

router.patch("/shoot-days/:shootDayId", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  const params = UpdateShootDayParams.safeParse(req.params);
  const body = UpdateShootDayBody.safeParse(req.body);
  if (!userId) return void res.status(401).json({ error: "Authentication required" });
  if (!params.success || !body.success) return void res.status(400).json({ error: "Invalid shoot day update" });

  const { shots, ...metadata } = body.data;
  const [day] = await db.update(shootDaysTable).set({ ...metadata, updatedAt: new Date() }).where(and(eq(shootDaysTable.id, params.data.shootDayId), eq(shootDaysTable.userId, userId))).returning();
  if (!day) return void res.status(404).json({ error: "Shoot day not found" });

  if (shots) {
    const projectIds = [...new Set(shots.map((shot) => shot.projectId))];
    const sceneIds = [...new Set(shots.map((shot) => shot.sceneId))];
    const ownedProjects = projectIds.length ? await db.select({ id: projectsTable.id }).from(projectsTable).where(and(eq(projectsTable.userId, userId), inArray(projectsTable.id, projectIds))) : [];
    const ownedScenes = sceneIds.length ? await db.select().from(scenesTable).where(and(eq(scenesTable.userId, userId), inArray(scenesTable.id, sceneIds))) : [];
    if (ownedProjects.length !== projectIds.length || ownedScenes.length !== sceneIds.length) {
      return void res.status(400).json({ error: "A selected shot is not available" });
    }
    const scenesById = new Map(ownedScenes.map((scene) => [scene.id, scene]));
    const invalidShot = shots.some((shot) => {
      const scene = scenesById.get(shot.sceneId);
      return !scene || scene.projectId !== shot.projectId || !scene.shots.some((item) => item.id === shot.shotId);
    });
    if (invalidShot) return void res.status(400).json({ error: "A selected shot is not available" });

    await db.delete(shootDayShotsTable).where(eq(shootDayShotsTable.shootDayId, day.id));
    if (shots.length) {
      await db.insert(shootDayShotsTable).values(shots.map((shot, index) => ({
        shootDayId: day.id,
        projectId: shot.projectId,
        sceneId: shot.sceneId,
        shotId: shot.shotId,
        position: index,
        status: shot.status,
        plannedSetupTime: shot.plannedSetupTime,
      })));
    }
  }

  res.json(await dayResponse(day));
});

export default router;