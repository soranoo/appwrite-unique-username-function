"use server";

import { Client, ExecutionMethod, Functions } from "node-appwrite";
import { usernameSchema } from "~/utils/schames";
import { cookies } from "next/headers"
import setCookie from "set-cookie-parser";
import { env } from "~/env";

type CheckUsernameAvailabilityActionResponse = {
  isAvailable: boolean;
};

type CheckUsernameAvailabilityActionProps = {
  username: string;
};

export const checkUsernameAvailabilityAction = async (unsafeProps: CheckUsernameAvailabilityActionProps) => {
  const username = usernameSchema.parse(unsafeProps.username);

  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID);

  const functions = new Functions(client);

  const result = await functions.createExecution(
    env.APPWRITE_USERNAME_CHECK_FUNCTION_ID,
    JSON.stringify({ username: username }),
    false,
    "check",
    ExecutionMethod.POST,
    {
      "x-username-reservation-session-id": cookies().get("ur")?.value,
    }
  );

  if (!result.responseBody) {
    throw new Error("No response body");
  }

  const cookieToSet = result.responseHeaders.find(
    (header) => header.name === "set-cookie",
  )?.value;

  if (cookieToSet) {
    const headerCookies = setCookie.parse(cookieToSet);
    headerCookies.forEach((cookie) => {
      cookies().set(cookie.name, cookie.value, {
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite as "lax" | "strict" | "none" | undefined,
      });
    });
  }

  return JSON.parse(result.responseBody) as CheckUsernameAvailabilityActionResponse;
}
