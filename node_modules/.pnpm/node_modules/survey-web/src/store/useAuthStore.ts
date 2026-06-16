import type { User } from "@survey/types";
import { create } from "zustand";

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  isAuthenticated: false,
  token: null,

  setAuth: (user, token) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    set({ currentUser: user, isAuthenticated: true, token });
  },

  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    set({ currentUser: null, isAuthenticated: false, token: null });
  },

  initializeAuth: () => {
    const token = localStorage.getItem("auth_token");
    const userJson = localStorage.getItem("auth_user");
    if (token && userJson) {
      try {
        const user = JSON.parse(userJson) as User;
        set({ currentUser: user, isAuthenticated: true, token });
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
  },
}));
