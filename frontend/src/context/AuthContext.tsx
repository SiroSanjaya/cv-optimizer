import React, { createContext, useContext, useEffect, useState } from "react";
import { type User, fetchCurrentUser, googleLogin, demoLogin, logoutUser } from "../lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  loginWithGoogle: (credentialOrToken: string) => Promise<void>;
  loginWithDemo: (name?: string, email?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const currentUser = await fetchCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const handleGoogleLogin = async (credentialOrToken: string) => {
    const res = await googleLogin(credentialOrToken);
    setUser(res.user);
  };

  const handleDemoLogin = async (name?: string, email?: string) => {
    const res = await demoLogin(name, email);
    setUser(res.user);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithGoogle: handleGoogleLogin,
        loginWithDemo: handleDemoLogin,
        logout: handleLogout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
