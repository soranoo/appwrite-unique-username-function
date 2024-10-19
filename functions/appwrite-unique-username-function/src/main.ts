import type { Models } from "node-appwrite";

import { Client, Databases, ID } from "node-appwrite";
import cookie from "cookie";
import { usernameReservationSchema, usernameSchema } from "./schames.js";
import { COOKIES } from "./constants.js";
import { checkIsUsernameReserved, checkIsUsernameUsed, deleteReservation, getReservationSessionIdByHashedUsername, hashUsername, insertReservation, updateReservation } from "./utils.js";

// This Appwrite function will be executed every time your function is triggered
export default async ({ req, res, log, error }: any) => {
  // You can use the Appwrite SDK to interact with other services
  // For this example, we're using the Users service
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || "")
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || "")
    .setKey(req.headers["x-appwrite-key"] ?? "");
  const event = req.headers["x-appwrite-event"] ?? "";
  const dbs = new Databases(client);

  log(`Event: ${event}`);

  const cookies = cookie.parse(req.headers.cookie || "");
  log(`Cookies: ${JSON.stringify(cookies)}`);

  // log(req.bodyText); // Raw request body, contains request data
  // // log(JSON.stringify(req.bodyJson));    // Object from parsed JSON request body, otherwise string
  // log(JSON.stringify(req.headers || {})); // String key-value pairs of all request headers, keys are lowercase
  // log(req.scheme); // Value of the x-forwarded-proto header, usually http or https
  // log(req.method); // Request method, such as GET, POST, PUT, DELETE, PATCH, etc.
  // log(req.url); // Full URL, for example: http://awesome.appwrite.io:8000/v1/hooks?limit=12&offset=50
  // log(req.host); // Hostname from the host header, such as awesome.appwrite.io
  // log(req.port); // Port from the host header, for example 8000
  // log(req.path); // Path part of URL, for example /v1/hooks
  // log(req.queryString); // Raw query params string. For example "limit=12&offset=50"
  // // log(JSON.stringify(req.query));       // Parsed query params. For example, req.query.limit

  if (/databases\.[\w\d]+\.collections\.[\w\d]+/.test(event) && req.method === "POST") {
    if (typeof req.bodyText !== "string") {
      return res.json({}, 400);
    }
    const collectionData = JSON.parse(req.bodyText) as Models.Document & { username: string };
    if (!collectionData.username) {
      throw new Error("Username is not provided");
    }

    // Found the reservation session id by the username
    const hashedUsername = await hashUsername(collectionData.username);
    const reservationSessionId = await getReservationSessionIdByHashedUsername(dbs, hashedUsername);

    const results = await deleteReservation(dbs, reservationSessionId);

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        log(`Successfully deleted session: ${result.value}`);
      } else {
        error(`Failed to delete session: ${result.reason}`);
      }
    });

    return res.json({}, 200);
  }

  if (req.path !== "/check") {
    return res.json({}, 404);
  } else if (req.method !== "POST") {
    return res.json({}, 405);
  }

  const unsafeUsername = req.bodyJson.username;
  let cookiesToSet: Record<string, string> = {};

  try {
    const username = usernameSchema.parse(unsafeUsername);

    let reservationSessionId = cookies[COOKIES.USERNAME_RESERVATION];

    if (!reservationSessionId) {
      // If no session id is found, create a new one
      const newSessionId = ID.unique();
      reservationSessionId = newSessionId;
      cookiesToSet["Set-Cookie"] = cookie.serialize(COOKIES.USERNAME_RESERVATION, newSessionId, {
        expires: new Date(Date.now() + 1000 * 60 * 5), // 5 minutes
        httpOnly: true,
        secure: true,
        sameSite: "lax",
      });
    }

    /**
     * Whether the username is available (not existing in the database)
     */
    let isUsernameAvailable = false;

    const hashedUsername = await hashUsername(username);

    const [isUsed, reserveRes] = await Promise.all([
      checkIsUsernameUsed(dbs, username),
      checkIsUsernameReserved(dbs, hashedUsername, reservationSessionId),
    ]);

    if (isUsed || (reserveRes.isReserved && !reserveRes.isExpired && !reserveRes.isOwnedByThisUser)) {
      log(`Username "${username}" is not available, isUsed: ${isUsed}, isReserved: ${reserveRes.isReserved}, isExpired: ${reserveRes.isExpired}, isOwnedByThisUser: ${reserveRes.isOwnedByThisUser}`);
      return res.json({ isAvailable: false }, 200, {
        ...cookiesToSet,
      });
    } else if (!isUsed && !reserveRes.isReserved) {
      // If the username is not used and not reserved, means it does not exist in the database
      isUsernameAvailable = true;
    }

    if (isUsernameAvailable) {
      // If the username is available, insert the reservation
      await insertReservation(dbs, hashedUsername, reservationSessionId);

      log(`Username "${username}" is available for reservation`);
      return res.json({ isAvailable: true }, 200, {
        ...cookiesToSet,
      });
    } else if (reserveRes.isOwnedByThisUser) {
      // If the username is owned by this user, update the reservation
      await updateReservation(dbs, hashedUsername, reservationSessionId);

      log(`Username "${username}" is owned by this user`);
      return res.json({ isAvailable: true }, 200, {
        ...cookiesToSet,
      });
    } else if (reserveRes.isExpired) {
      // If the reservation is expired, that means this username is open for reservation
      await updateReservation(dbs, hashedUsername, reservationSessionId);

      log(`Username "${username}" is expired and available for reservation`);
      return res.json({ isAvailable: true }, 200, {
        ...cookiesToSet,
      });
    }

    log(`Username "${username}" is not available`);
    return res.json({ isAvailable: false }, 200, {
      ...cookiesToSet,
    });
  } catch (e) {
    // If an error occurs, the username assumed to be not available
    // to prevent adding unsure username to the database

    log(`Check Username Existence Error: ${e}`);

    return res.json({ isAvailable: false }, 500, {
      ...cookiesToSet,
    });
  }
};
