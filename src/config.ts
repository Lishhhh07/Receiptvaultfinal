import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  meta: {
    accessToken: requireEnv("META_ACCESS_TOKEN"),
    phoneNumberId: requireEnv("META_PHONE_NUMBER_ID"),
    verifyToken: requireEnv("META_VERIFY_TOKEN"),
  },
  supabase: {
    url: requireEnv("SUPABASE_URL"),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  },
  gemini: {
    apiKey: requireEnv("GEMINI_API_KEY"),
  },
  r2: {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    bucketName: requireEnv("R2_BUCKET_NAME"),
    publicUrl: requireEnv("R2_PUBLIC_URL"),
  },
  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },
  port: parseInt(process.env.PORT || "3000", 10),
} as const;
