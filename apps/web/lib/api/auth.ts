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
   * Student registration. Creates the account immediately as pending email
   * verification (no tokens issued here) and sends the first OTP - call
   * verifyEmailOtp next, which is what actually logs the student in.
   */
  studentSignup: async (data: Record<string, string>) => {
    return apiClient<{ id: number; username: string; email: string; pending_verification: true; detail: string }>(
      "/auth/signup/",
      { method: "POST", body: JSON.stringify(data) }
    );
  },

  /**
   * Confirms the code emailed by studentSignup (or resendSignupOtp) and, on
   * success, logs the student in.
   */
  verifyEmailOtp: async (email: string, otp: string) => {
    const response = await apiClient<{ access: string; refresh: string; user: User }>("/auth/verify-email-otp/", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    });
    setAuthToken(response.access, response.refresh);
    return response;
  },

  /**
   * Confirms an admin-generated recovery code for a student who never
   * received their email OTP. Does NOT log the student in - they use the
   * normal login form afterward, same as any other verified account.
   */
  verifyRecoveryCode: async (email: string, code: string) => {
    return apiClient<{ verified: boolean; detail: string }>("/auth/verify-recovery-code/", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
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
   * Resends the signup verification code for an already-registered but
   * still-unverified account ("I didn't get it" / "it expired"). studentSignup
   * already sends the first one automatically.
   */
  requestSignupOtp: async (email: string) => {
    return apiClient<{ detail?: string; error?: string }>("/auth/signup/request-otp/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Sends a password-reset verification code (emailed by the Django API) to the given
   * email, if an account exists for it. Always returns the same generic
   * response regardless of whether the account exists.
   */
  forgotPassword: async (email: string) => {
    return apiClient<{ detail: string; configured: boolean }>("/auth/forgot-password/", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Completes a password reset with the OTP emailed by forgotPassword.
   */
  resetPassword: async (email: string, otp: string, password: string) => {
    return apiClient<{ detail: string }>("/auth/reset-password/", {
      method: "POST",
      body: JSON.stringify({ email, otp, password }),
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
