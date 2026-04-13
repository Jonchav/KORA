import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transformRouter from "./transform";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transformRouter);

export default router;
