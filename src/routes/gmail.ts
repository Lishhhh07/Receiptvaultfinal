import { Router } from "express";
import { getGmailConsentUrl, storeGmailTokenFromCode } from "../services/gmail.js";

const gmailRouter = Router();

gmailRouter.get("/auth/google", (_req, res) => {
  const url = getGmailConsentUrl();
  res.redirect(url);
});

gmailRouter.get("/auth/google/callback", async (req, res) => {
  const code = String(req.query.code ?? "");
  if (!code) {
    res.status(400).json({ error: "Missing code query param." });
    return;
  }
  await storeGmailTokenFromCode(code);
  res.json({ ok: true, message: "Google OAuth token stored." });
});

export default gmailRouter;
