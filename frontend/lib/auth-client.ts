import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000", // Your backend URL
  plugins: [
    expoClient({
      scheme: "artefact-ai", // Your app scheme for deep linking
      storagePrefix: "artefact-ai",
      storage: SecureStore,
    }),
  ],
});

// Export specific methods for easier use
export const { signIn, signUp, signOut, useSession } = authClient; 