import { AppError } from "./errors";

export type ServerEnv = {
  RAPIDAPI_KEY: string;
  RAPIDAPI_HOST: string;
  GEMINI_API_KEY: string;
  GEMINI_MODEL_ID: string;
};

function requireEnv(name: keyof ServerEnv) {
  const value = process.env[name];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AppError("INTERNAL_ERROR", `Не задана переменная окружения ${name}`, 500);
  }

  return value;
}

export function getServerEnv(): ServerEnv {
  return {
    RAPIDAPI_KEY: requireEnv("RAPIDAPI_KEY"),
    RAPIDAPI_HOST: requireEnv("RAPIDAPI_HOST"),
    GEMINI_API_KEY: requireEnv("GEMINI_API_KEY"),
    GEMINI_MODEL_ID: requireEnv("GEMINI_MODEL_ID")
  };
}
