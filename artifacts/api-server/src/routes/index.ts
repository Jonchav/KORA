import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transformRouter from "./transform";

const router: IRouter = Router();

router.use(healthRouter);
router.use(transformRouter);

export default router;
