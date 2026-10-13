import { createContext, useContext } from "react";
import type { User } from "../lib/api";

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: (credentialOrToken: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
