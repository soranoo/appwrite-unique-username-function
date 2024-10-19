import { z } from "zod";
import { usernameReservationSchema } from "./schames.js";

export type UsernameReservation = z.infer<typeof usernameReservationSchema>;

/**
 * Omits all Appwrite built-in fields (fields that start with `$`)
 * 
 * Note: Only remove the first layer of properties
 */
export type OmitAppwriteBuiltInFields<T> = Omit<T, `$${string}`>;
