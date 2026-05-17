import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { type UserInfo } from "./api";

export interface AuthUser extends UserInfo {
  providerId?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setUser: (u: AuthUser | null) => void;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  setUser: () => {},
  refetch: async () => {},
  logout: async () => {},
});

// DEMO MODE: Predefined users for different roles
const DEMO_USERS: Record<string, AuthUser> = {
  admin: { id: 1, name: "مدير النظام (تجريبي)", email: "admin@demo.com", role: "admin", avatar: null },
  provider: { id: 2, name: "مقدم خدمة (تجريبي)", email: "provider@demo.com", role: "provider", avatar: null, providerId: 1, providerApproved: true },
  user: { id: 3, name: "مستخدم (تجريبي)", email: "user@demo.com", role: "user", avatar: null }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // For demo, we determine the user based on the URL path
  useEffect(() => {
    const path = window.location.pathname;
    let currentUser = user;

    if (path.startsWith("/admin")) {
      currentUser = DEMO_USERS.admin;
    } else if (path.startsWith("/dashboard") || path.startsWith("/provider")) {
      currentUser = DEMO_USERS.provider;
    } else if (path.startsWith("/user")) {
      currentUser = DEMO_USERS.user;
    } else if (!currentUser) {
      // Default to guest for other pages unless already set
      currentUser = null;
    }

    setUser(currentUser);
    setLoading(false);
  }, [window.location.pathname]);

  const refetch = async () => {};
  const logout = async () => { setUser(null); };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, refetch, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
