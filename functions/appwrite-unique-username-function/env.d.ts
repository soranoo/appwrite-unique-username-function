declare global {
  namespace NodeJS {
    interface ProcessEnv {
      APPWRITE_FUNCTION_API_ENDPOINT: string;
      APPWRITE_FUNCTION_PROJECT_ID: string;
      APPWRITE_DATABASE_ID: string;

      /**
       * A collection ID for storing usernames that will be consumed
       */
      APPWRITE_COLLECTION_ID: string;
      
      /**
       * A collection ID for storing username reservations
       */
      APPWRITE_USERNAME_RESERVATION_COLLECTION_ID: string;
    }
  }
}

export {};
