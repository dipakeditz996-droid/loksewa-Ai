import { apiClient } from "./client";

export interface PlatformBranding {
  name: string;
  logoUrl: string | null;
  description: string;
}

export const platformApi = {
  getBranding: async (): Promise<PlatformBranding> => {
    return apiClient<PlatformBranding>("/public/platform-settings/");
  },
};
