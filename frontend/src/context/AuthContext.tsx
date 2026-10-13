import React, { useEffect, useState } from "react";
import {
  type User,
  deleteMyAccount,
  fetchCurrentUser,
  googleLogin,
  logoutUser,
} from "../lib/api";
import { AuthContext } from "./AuthContextValue";

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
    let isMounted = true;
    fetchCurrentUser()
      .then((currentUser) => {
        if (isMounted) setUser(currentUser);
      })
      .catch(() => {
        if (isMounted) setUser(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGoogleLogin = async (credentialOrToken: string) => {
    const res = await googleLogin(credentialOrToken);
    const currentUser = await fetchCurrentUser();
    setUser(currentUser ?? res.user);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
  };

  const handleDeleteAccount = async () => {
    await deleteMyAccount();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        loginWithGoogle: handleGoogleLogin,
        logout: handleLogout,
        deleteAccount: handleDeleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
