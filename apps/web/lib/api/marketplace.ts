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

export interface MarketplaceRevenueTrendPoint {
  date: string;
  revenue: number;
}

export interface MarketplacePaymentMethodBreakdown {
  method: string;
  count: number;
  percentage: number;
}

export interface MarketplaceOverview {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  revenueToday: number;
  revenueTrend: MarketplaceRevenueTrendPoint[];
  paymentMethodBreakdown: MarketplacePaymentMethodBreakdown[];
  recentOrders: Array<{
    id: number;
    product: string;
    buyer: string;
    seller: string;
    price: number;
    status: string;
    createdAt: string;
  }>;
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
  adminCreatePaymentMethod: async (data: Partial<PaymentMethod>) => {
    return apiClient<PaymentMethod>("/marketplace/admin/payment-methods/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  adminDeletePaymentMethod: async (id: number) => {
    return apiClient(`/marketplace/admin/payment-methods/${id}/`, { method: "DELETE" });
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
  adminRevokePurchase: async (id: number) => {
    return apiClient<Purchase>(`/marketplace/admin/purchases/${id}/revoke/`, { method: "POST" });
  },
  adminReactivatePurchase: async (id: number) => {
    return apiClient<Purchase>(`/marketplace/admin/purchases/${id}/reactivate/`, { method: "POST" });
  },

  // Admin - Overview
  // Real endpoint lives under /admin/marketplace/ (administration app), not
  // /marketplace/admin/ (which is just this router's own root - previously
  // wrong here, silently making every dashboard stat fall back to 0).
  adminGetOverview: async () => {
    return apiClient<MarketplaceOverview>("/admin/marketplace/");
  },
};
