import { apiClient, setAuthToken, clearAuthToken } from "./client";

export interface User {
  id: string | number;
  username: string;
  name: string;
  email: string;
  role: string;
  is_active?: boolean;
  avatar?: string | null;
}

export const authApi = {
  /**
   * Student/general login via SimpleJWT token obtain.
   */
  login: async (credentials: Record<string, string>) => {
    const data = await apiClient<{ access: string; refresh: string }>("/token/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setAuthToken(data.access, data.refresh);
    return data;
  },

  /**
   * Student registration
   */
  studentSignup: async (data: Record<string, string>) => {
    const response = await apiClient<{ access: string; refresh: string; user: User }>("/auth/signup/", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setAuthToken(response.access, response.refresh);
    return response;
  },

  /**
   * Admin-specific login. Backend validates credentials AND role.
   */
  adminLogin: async (credentials: { username: string; password: string }) => {
    const data = await apiClient<{
      access: string;
      refresh: string;
      user: User;
    }>("/auth/admin-login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    setAuthToken(data.access, data.refresh);
    return data;
  },

  /**
   * Logout — blacklists the refresh token on the backend, then clears local state.
   */
  logout: (redirectTo: string = "/login") => {
    if (typeof window === "undefined") return;
    const refresh = localStorage.getItem("refresh_token");
    // Fire-and-forget — we don't need to await this
    if (refresh) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";
      fetch(`${API_URL}/auth/logout/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      }).catch(() => {});
    }
    clearAuthToken();
    window.location.href = redirectTo;
  },

  /**
   * Get the current authenticated user's info.
   */
  me: async (): Promise<User> => {
    return apiClient<User>("/auth/me/", { skipRedirect: true });
  },

  /**
   * Forgot password stub.
   */
  forgotPassword: async (email: string) => {
    return apiClient<{ detail: string; configured: boolean }>("/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },
};
