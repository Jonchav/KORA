import { Router, type IRouter } from "express";
import healthRouter from "./health";
import transformRouter from "./transform";
import authRouter from "./auth";
import billingRouter from "./billing";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(transformRouter);
router.use(billingRouter);

export default router;
