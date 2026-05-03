import { promises as fs } from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const TOKEN_PATH = path.resolve("src/memory/oauth/gmail_token.json");
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REDIRECT_URI.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGmailConsentUrl(): string {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent"
  });
}

export async function storeGmailTokenFromCode(code: string): Promise<void> {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens, null, 2), "utf8");
}

export async function getGmailClient() {
  const oauth2Client = getOAuthClient();
  const raw = await fs.readFile(TOKEN_PATH, "utf8");
  const credentials = JSON.parse(raw) as Record<string, string>;
  oauth2Client.setCredentials(credentials);

  // Persist refreshed access tokens automatically if Google rotates them.
  oauth2Client.on("tokens", async (tokens) => {
    if (!tokens.access_token && !tokens.refresh_token) return;
    const merged = { ...credentials, ...tokens };
    await fs.mkdir(path.dirname(TOKEN_PATH), { recursive: true });
    await fs.writeFile(TOKEN_PATH, JSON.stringify(merged, null, 2), "utf8");
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}
