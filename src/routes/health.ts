import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    status: "ok",
    project: "ReceiptVault",
    hackathon: "Samsung Clash of the Claws — OpenClaw Hackathon 2026",
    theme: "Theme 2: Daily Utility (Smartphones)",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

export default router;
