import { apiClient } from "./client";

export interface MyTestimonial {
  id: number;
  name: string;
  role_title: string;
  quote: string;
  avatar_url: string;
  rating: number;
  is_published: boolean;
  updated_at: string;
}

export interface TestimonialInput {
  name?: string;
  role_title?: string;
  quote: string;
  avatar_url?: string;
  rating?: number;
}

// Authenticated endpoints only — reached with whatever access token the
// student already has from being logged in, same as any other student API
// call. There is never a separate login step here.
export const testimonialsApi = {
  getMine: async (): Promise<MyTestimonial | null> => {
    const res = await apiClient<{ testimonial: MyTestimonial | null }>("/testimonials/mine/");
    return res.testimonial;
  },

  submit: (data: TestimonialInput): Promise<MyTestimonial> =>
    apiClient<MyTestimonial>("/testimonials/mine/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteMine: (): Promise<void> =>
    apiClient<void>("/testimonials/mine/", { method: "DELETE" }),
};
