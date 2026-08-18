import { apiClient } from "./client";

export interface Product {
  id: number;
  title: string;
  description: string;
  features: string[];
  category: string;
  target_exam: number | null;
  target_position: string;
  is_free: boolean;
  price: string;
  discount_price: string | null;
  final_price: string;
  cover_image: string | null;
  product_file: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: number;
  method_type: 'ESEWA' | 'KHALTI' | 'BANK';
  display_name: string;
  is_active: boolean;
  account_name: string;
  account_number: string;
  bank_name: string;
  branch: string;
  qr_image: string | null;
  instructions: string;
}

export interface PaymentSubmission {
  id: number;
  student: number;
  student_details?: any;
  product: number;
  product_details?: Product;
  payment_method: number;
  payment_method_details?: PaymentMethod;
  transaction_id: string;
  expected_amount: string;
  submitted_amount: string;
  screenshot: string;
  note: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejection_reason: string;
  submitted_at: string;
  verified_at: string | null;
}

export interface Purchase {
  id: number;
  student: number;
  product: number;
  product_details?: Product;
  payment_submission: number;
  payment_submission_details?: PaymentSubmission;
  amount_paid: string;
  status: 'ACTIVE' | 'REVOKED';
  created_at: string;
  approved_at: string;
}

export const marketplaceApi = {
  // Student - Products
  getProducts: async () => {
    return apiClient<Product[]>("/marketplace/student/products/");
  },
  getProduct: async (id: number) => {
    return apiClient<Product>(`/marketplace/student/products/${id}/`);
  },
  
  // Student - Payment Methods
  getPaymentMethods: async () => {
    return apiClient<PaymentMethod[]>("/marketplace/student/payment-methods/");
  },

  // Student - Payment Submissions
  getSubmissions: async () => {
    return apiClient<PaymentSubmission[]>("/marketplace/student/payment-submissions/");
  },
  submitPayment: async (data: FormData) => {
    return apiClient<PaymentSubmission>("/marketplace/student/payment-submissions/", {
      method: "POST",
      body: data
    });
  },

  // Student - Purchases
  getPurchases: async () => {
    return apiClient<Purchase[]>("/marketplace/student/purchases/");
  },

  // Admin - Products
  adminGetProducts: async () => {
    return apiClient<Product[]>("/marketplace/admin/products/");
  },
  adminCreateProduct: async (data: FormData) => {
    return apiClient<Product>("/marketplace/admin/products/", {
      method: "POST",
      body: data
    });
  },
  adminUpdateProduct: async (id: number, data: FormData | Partial<Product>) => {
    const isFormData = data instanceof FormData;
    return apiClient<Product>(`/marketplace/admin/products/${id}/`, {
      method: "PATCH",
      body: isFormData ? (data as FormData) : JSON.stringify(data),
    });
  },
  adminDeleteProduct: async (id: number) => {
    return apiClient(`/marketplace/admin/products/${id}/`, { method: "DELETE" });
  },

  // Admin - Payment Methods
  adminGetPaymentMethods: async () => {
    return apiClient<PaymentMethod[]>("/marketplace/admin/payment-methods/");
  },
  adminUpdatePaymentMethod: async (id: number, data: FormData | Partial<PaymentMethod>) => {
    const isFormData = data instanceof FormData;
    return apiClient<PaymentMethod>(`/marketplace/admin/payment-methods/${id}/`, {
      method: "PATCH",
      body: isFormData ? (data as FormData) : JSON.stringify(data),
    });
  },

  // Admin - Payment Submissions
  adminGetSubmissions: async () => {
    return apiClient<PaymentSubmission[]>("/marketplace/admin/payment-submissions/");
  },
  adminReviewSubmission: async (id: number, status: 'APPROVED' | 'REJECTED', rejection_reason?: string) => {
    return apiClient<PaymentSubmission>(`/marketplace/admin/payment-submissions/${id}/review/`, {
      method: "POST",
      body: JSON.stringify({ status, rejection_reason })
    });
  },

  // Admin - Purchases
  adminGetPurchases: async () => {
    return apiClient<Purchase[]>("/marketplace/admin/purchases/");
  },
};
