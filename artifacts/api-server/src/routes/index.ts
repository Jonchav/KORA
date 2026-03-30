import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transformRouter from "./transform";
import authRouter from "./auth";
import { requireAuth } from "../middleware/requireAuth";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(requireAuth, transformRouter);

export default router;
