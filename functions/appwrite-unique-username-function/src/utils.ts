import type { Databases, Models } from "node-appwrite";

import { AppwriteException, Query } from "node-appwrite";
import xxhash from "xxhash-wasm";
import { OmitAppwriteBuiltInFields, UsernameReservation } from "./types.js";
import { z } from "zod";

export const hashUsername = async (username: string) => {
  const hash = await xxhash();
  return hash.h64ToString(username);
};

export const insertReservation = async (dbs: Databases, hashedUsername: string, reservationSessionId: string) => {
  await dbs.createDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERNAME_RESERVATION_COLLECTION_ID,
    hashedUsername,
    {
      reservationSessionId: reservationSessionId,
      expireAt: Date.now() + 1000 * 60 * 5, // 5 minutes
    } satisfies OmitAppwriteBuiltInFields<UsernameReservation>
  );
};

export const updateReservation = async (dbs: Databases, hashedUsername: string, reservationSessionId: string) => {
  await dbs.updateDocument(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERNAME_RESERVATION_COLLECTION_ID,
    hashedUsername,
    {
      reservationSessionId: reservationSessionId,
      expireAt: Date.now() + 1000 * 60 * 5, // 5 minutes
    } satisfies Partial<OmitAppwriteBuiltInFields<UsernameReservation>>
  );
};

export const checkIsUsernameReserved = async (dbs: Databases, hashedUsername: string, reservationSessionId: string): Promise<{
  isReserved: boolean;
  isExpired: boolean;
  isOwnedByThisUser: boolean;
}> => {
  const [error, doc] = await catchError(
    getReservation(dbs, hashedUsername), [AppwriteException]
  );

  if (error) {
    if (error.type === "document_not_found") {
      return {
        isReserved: false,
        isExpired: false,
        isOwnedByThisUser: false,
      };
    } else {
      throw error;
    }
  }

  return {
    isReserved: true,
    isExpired: doc.expireAt < Date.now(),
    isOwnedByThisUser: doc.reservationSessionId === reservationSessionId,
  };
};

export const checkIsUsernameUsed = async (dbs: Databases, username: string): Promise<boolean> => {
  const docs = await dbs.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_COLLECTION_ID,
    [
      Query.equal("username", username),
      Query.limit(1), //? We only need to check if the username is used or not
      Query.select(["$id"]) //? To avoid pulling too much data
    ]
  );

  if (docs.total === 0) {
    return false;
  }

  return true;
};

export const getReservation = async (dbs: Databases, hashedUsername: string): Promise<UsernameReservation & Models.Document> => {
  const doc = dbs.getDocument<UsernameReservation & Models.Document>(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERNAME_RESERVATION_COLLECTION_ID,
    hashedUsername)

  return doc;
};

export const deleteReservation = async (dbs: Databases, reservationSessionId: string) => {
  // Get all reservations for this reservation session id
  const docs = await dbs.listDocuments(
    process.env.APPWRITE_DATABASE_ID,
    process.env.APPWRITE_USERNAME_RESERVATION_COLLECTION_ID,
    [
      Query.equal("reservationSessionId", reservationSessionId),
      Query.select(["$id"]),
    ]
  );
  const sessionIds = docs.documents.map((doc) => doc.$id);

  // Delete all reservations for this reservation session id
  const deletePromises = sessionIds.map(async (sessionId) => {
    return dbs.deleteDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_USERNAME_RESERVATION_COLLECTION_ID,
      sessionId
    );
  });

  const results = await Promise.allSettled(deletePromises);
  return results;
};

export const getReservationSessionIdByHashedUsername = async (dbs: Databases, hashedUsername: string): Promise<string> => {
  const doc = await getReservation(dbs, hashedUsername);
  return doc.reservationSessionId;
}

/**
 * Get the error message from a Zod error object
 * 
 * Why this function is needed:
 * Zod error message is a JSON string(I guess it's a bug).
 * This function parses the JSON string and returns the error message from the Zod error "message".
 * 
 * @param error The Zod error object
 * @returns The error message
 * @based https://github.com/colinhacks/zod/issues/2883#issuecomment-2120758989
 */
export const getZodErrorMessage = (error: z.ZodError): string => {
  const message = error.message;
  const parsedMessage = JSON.parse(message) as Array<{ message: string }>;
  const zodError = parsedMessage[0];
  if (!zodError) throw Error("Zod is broken");
  return zodError.message;
}

export const catchError = async <T, E extends new (...args: any[]) => Error>(promise: Promise<T>, errorsToCatch?: E[]): Promise<[undefined, T] | [InstanceType<E>, undefined]> => {
  try {
    const res = await promise;
    return [undefined, res] as [undefined, T];
  } catch (e) {
    if (!errorsToCatch || (errorsToCatch && errorsToCatch.some((error) => e instanceof error))) {
      return [e, undefined] as [InstanceType<E>, undefined];
    }
    throw e;
  }
};
