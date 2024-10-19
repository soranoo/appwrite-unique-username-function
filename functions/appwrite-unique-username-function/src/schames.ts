import { z } from "zod";

const idSchema = z.string()
  .regex(/^[A-Za-z0-9_-]+$/, "ID can only contain alphanumeric characters, underscores, and dashes")
  .max(36, "ID must not be longer than 36 characters");

export const usernameSchema = z.string()
  .min(0)
  .max(100, "Username must not be longer than 100 characters")
  .regex(/^[A-Za-z0-9_-]+$/, "ID can only contain alphanumeric characters, underscores, and dashes");

export const usernameReservationSchema = z.object({
  reservationSessionId: idSchema,

  /**
   * Expire at in timestamp
   */
  expireAt: z.number().int(),
});
