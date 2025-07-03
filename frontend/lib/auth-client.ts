import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "../config/api";

export const authClient = createAuthClient({
  baseURL: API_BASE_URL, // Smart environment-based URL
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