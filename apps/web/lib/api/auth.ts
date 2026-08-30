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
   * If the account has 2FA enabled, returns { twoFactorRequired: true, pendingToken }
   * instead of tokens — call `completeTwoFactorLogin` next.
   */
  adminLogin: async (credentials: { username: string; password: string }) => {
    const data = await apiClient<{
      access?: string;
      refresh?: string;
      user?: User;
      twoFactorRequired?: boolean;
      pendingToken?: string;
    }>("/auth/admin-login/", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    if (data.twoFactorRequired) {
      return data;
    }
    setAuthToken(data.access!, data.refresh!);
    return data;
  },

  /**
   * Completes an admin login that returned twoFactorRequired, with a TOTP
   * or backup code.
   */
  completeTwoFactorLogin: async (pendingToken: string, code: string) => {
    const data = await apiClient<{ access: string; refresh: string; user: User }>("/auth/2fa/login/", {
      method: "POST",
      body: JSON.stringify({ pendingToken, code }),
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
      apiClient("/auth/logout/", {
        method: "POST",
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

  socialLogin: async (provider: 'google' | 'facebook' | 'apple', token: string, additional_data?: any) => {
    const data = await apiClient<{ access: string; refresh: string }>("/auth/social/", {
      method: "POST",
      body: JSON.stringify({ provider, token, additional_data }),
    });
    setAuthToken(data.access, data.refresh);
    return data;
  },
};

export const twoFactorApi = {
  status: async () => {
    return apiClient<{ platformEnabled: boolean; enabled: boolean }>("/auth/2fa/status/");
  },
  setup: async () => {
    return apiClient<{ secret: string; otpauthUri: string }>("/auth/2fa/setup/", { method: "POST" });
  },
  verifySetup: async (code: string) => {
    return apiClient<{ enabled: boolean; backupCodes: string[] }>("/auth/2fa/verify-setup/", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },
  disable: async (password: string) => {
    return apiClient<{ enabled: boolean }>("/auth/2fa/disable/", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  },
};
