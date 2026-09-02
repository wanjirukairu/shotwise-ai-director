import { Router, type IRouter } from "express";
import geminiRouter from "./gemini";
import healthRouter from "./health";
import projectsRouter from "./projects";
import shootDaysRouter from "./shootDays";

const router: IRouter = Router();

router.use(healthRouter);
router.use(geminiRouter);
router.use(projectsRouter);
router.use(shootDaysRouter);

export default router;
