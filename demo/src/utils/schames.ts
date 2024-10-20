import { z } from "zod";

export const usernameSchema = z.string()
  .min(0)
  .max(100, "Username must not be longer than 100 characters")
  .regex(/^[A-Za-z0-9_-]+$/, "ID can only contain alphanumeric characters, underscores, and dashes");
