"use server";

import { AppwriteException, Client, Databases, ID } from "node-appwrite";
import { env } from "~/env";
import { usernameSchema } from "~/utils/schames";

type TakeUsernameActionProps = {
  username: string;
};

export const takeUsernameAction = async (unsafeProps: TakeUsernameActionProps) => {
  const username = usernameSchema.parse(unsafeProps.username);

  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID);
  const dbs = new Databases(client)

  try {
    await dbs.createDocument(
      env.APPWRITE_DATABASE_ID,
      env.APPWRITE_COLLECTION_ID,
      ID.unique(),
      {
        username: username,
      }
    )

    return {
      success: true,
      error: null,
    }
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message
      }
    } else if (error instanceof AppwriteException) {
      return {
        success: false,
        error: error.message
      }
    }
    return {
      success: false,
      error: "Unknown error"
    }
  }
}
