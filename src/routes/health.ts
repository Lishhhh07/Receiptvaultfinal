import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    uptimeSeconds: Math.round(process.uptime())
  });
});

export default healthRouter;
