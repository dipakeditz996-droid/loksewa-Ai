import { apiClient } from "./client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProductImage {
  id: number;
  product: number;
  image: string;
  label: string;
  label_display?: string;
  is_primary: boolean;
  created_at: string;
}

export interface SellerDetails {
  id: number;
  first_name: string;
  last_name?: string;
  full_name?: string;
  member_since: string | null;
  average_rating?: number;
  total_reviews?: number;
}

export interface Product {
  id: number;
  title: string;
  description: string;
  features: string[];
  category: string;
  category_display?: string;
  target_exam: number | null;
  target_position: string;
  price: string;
  discount_price: string | null;
  final_price: string;
  cover_image: string | null;
  is_published: boolean;
  is_seller_listing: boolean;

  // Physical/Seller fields
  condition?: string | null;
  condition_display?: string | null;
  condition_details?: {
    highlighting?: boolean;
    writing_notes?: boolean;
    page_damage?: boolean;
    cover_condition?: string;
    missing_pages?: boolean;
    water_damage?: boolean;
    binding_condition?: string;
    extra_notes?: string;
  };
  stock?: number;
  listing_status?: string;
  listing_status_display?: string;
  negotiable?: boolean;
  location?: string;
  author?: string;
  publisher?: string;
  isbn?: string;
  edition?: string;
  publication_year?: string;
  brand?: string;
  seller?: number | null;
  seller_details?: SellerDetails | null;
  rejection_reason?: string;

  // Relations
  images?: ProductImage[];

  created_at: string;
  updated_at: string;
  average_rating?: number;
  total_reviews?: number;
}

export interface PaymentMethod {
  id: number;
  method_type: "ESEWA" | "KHALTI" | "BANK";
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
  product: number | null;
  product_details?: Product;
  order: number | null;
  payment_method: number;
  payment_method_details?: PaymentMethod;
  transaction_id: string;
  expected_amount: string;
  submitted_amount: string;
  screenshot: string;
  note: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
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
  status: "ACTIVE" | "REVOKED";
  created_at: string;
  approved_at: string;
}

export interface CartItem {
  id: number;
  cart: number;
  product: number;
  product_details?: Product;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Cart {
  id: number;
  student: number;
  items: CartItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: number;
  order: number;
  product: number;
  product_details?: Product;
  quantity: number;
  price: string;
  commission_amount?: string;
  seller_earning?: string;
  fulfillment_status?: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  payout_status?: "PENDING" | "ELIGIBLE" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
  snapshot_product_name?: string;
  snapshot_seller_name?: string;
}

export interface DeliveryAddress {
  id: number;
  student: number;
  full_name: string;
  phone_number: string;
  province: string;
  district: string;
  municipality: string;
  ward_number: string;
  tole_area: string;
  street_landmark: string;
  delivery_note: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderStatusHistory {
  id: number;
  order: number;
  previous_status: string;
  new_status: string;
  changed_by: number | null;
  changed_by_name: string;
  note: string;
  created_at: string;
}

export interface DeliveryFeeRule {
  id: number;
  name: string;
  province: string;
  district: string;
  municipality: string;
  fee: string;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  student: number;
  status:
    | "PENDING_PAYMENT"
    | "PAYMENT_SUBMITTED"
    | "PAYMENT_VERIFICATION"
    | "CONFIRMED"
    | "PROCESSING"
    | "SHIPPED"
    | "OUT_FOR_DELIVERY"
    | "DELIVERED"
    | "CANCELLED"
    | "REFUNDED";
  total_amount: string;
  delivery_fee: string;
  shipping_address: string;
  contact_number: string;
  delivery_address_ref?: number | null;
  delivery_address_details?: DeliveryAddress;
  items: OrderItem[];
  status_history?: OrderStatusHistory[];
  created_at: string;
  updated_at: string;
}

/** Seller's view of an order (buyer identity is anonymized) */
export interface SellerSale {
  id: number;
  status: Order["status"];
  total_amount: string;
  delivery_fee: string;
  buyer_display: { name: string; shipping_address: string };
  my_items: {
    id: number;
    product: number;
    product_details: { id: number; title: string; cover_image: string | null };
    quantity: number;
    price: string;
    commission_amount: string;
    seller_earning: string;
    fulfillment_status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
    payout_status: "PENDING" | "ELIGIBLE" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED";
    snapshot_product_name: string;
  }[];
  created_at: string;
  updated_at: string;
}

export interface MarketplaceListingReport {
  id: number;
  listing: number;
  reporter: number;
  reason: string;
  reason_display?: string;
  description: string;
  status: "PENDING" | "REVIEWED" | "DISMISSED";
  status_display?: string;
  admin_response: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceSettings {
  id: number;
  platform_commission_percentage: string;
  max_listing_images: number;
  allow_student_listings: boolean;
  updated_at: string;
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

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------


export interface Review {
  id: number;
  order_item: number;
  product: number;
  buyer: number;
  seller: number;
  rating: number;
  review_text: string;
  status: 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';
  created_at: string;
}

export interface DisputeEvidence {
  id: number;
  image: string;
  uploaded_by: number;
  created_at: string;
}

export interface Dispute {
  id: number;
  order_item: number;
  buyer: number;
  seller: number;
  reason: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';
  resolution?: string;
  admin_notes?: string;
  evidence: DisputeEvidence[];
  created_at: string;
  resolved_at?: string;
  resolved_by?: number;
}

export const marketplaceApi = {
  // Student - Products (browse)
  getProducts: async (params?: {
    category?: string;
    condition?: string;
    seller_type?: "student" | "platform" | "all";
    location?: string;
    min_price?: string;
    max_price?: string;
    search?: string;
    sort?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append("category", params.category);
    if (params?.condition) query.append("condition", params.condition);
    if (params?.seller_type && params.seller_type !== "all")
      query.append("seller_type", params.seller_type);
    if (params?.location) query.append("location", params.location);
    if (params?.min_price) query.append("min_price", params.min_price);
    if (params?.max_price) query.append("max_price", params.max_price);
    if (params?.search) query.append("search", params.search);
    if (params?.sort) query.append("sort", params.sort);
    const qs = query.toString();
    return apiClient<Product[]>(
      `/marketplace/student/products/${qs ? `?${qs}` : ""}`
    );
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
    return apiClient<PaymentSubmission[]>(
      "/marketplace/student/payment-submissions/"
    );
  },
  submitPayment: async (data: FormData) => {
    return apiClient<PaymentSubmission>(
      "/marketplace/student/payment-submissions/",
      { method: "POST", body: data }
    );
  },

  // Student - Purchases
  getPurchases: async () => {
    return apiClient<Purchase[]>("/marketplace/student/purchases/");
  },

  // Student - Cart
  getCart: async () => {
    return apiClient<Cart>("/marketplace/student/cart/");
  },
  addToCart: async (product_id: number, quantity: number = 1) => {
    // NOTE: backend expects `product_id` (not `product`)
    return apiClient<Cart>("/marketplace/student/cart/add_item/", {
      method: "POST",
      body: JSON.stringify({ product_id, quantity }),
    });
  },
  removeFromCart: async (item_id: number) => {
    return apiClient<Cart>("/marketplace/student/cart/remove_item/", {
      method: "POST",
      body: JSON.stringify({ item_id }),
    });
  },
  // Legacy compat: update cart item quantity
  updateCartItem: async (id: number, quantity: number) => {
    return apiClient<CartItem>(`/marketplace/student/cart/items/${id}/`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
  },

  // Student - Orders
  getOrders: async () => {
    return apiClient<Order[]>("/marketplace/student/orders/");
  },
  getOrder: async (id: number) => {
    return apiClient<Order>(`/marketplace/student/orders/${id}/`);
  },
  calculateFee: async (data: { delivery_address_id: number }) => {
    return apiClient<{ delivery_fee: string | number }>(
      "/marketplace/student/orders/calculate_fee/",
      { method: "POST", body: JSON.stringify(data) }
    );
  },
  createOrder: async (data: {
    delivery_address_id?: number;
    shipping_address?: string;
    contact_number?: string;
    note?: string;
  }) => {
    return apiClient<Order>("/marketplace/student/orders/checkout/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Student - Delivery Addresses
  getDeliveryAddresses: async () => {
    return apiClient<DeliveryAddress[]>(
      "/marketplace/student/delivery-addresses/"
    );
  },
  createDeliveryAddress: async (data: Partial<DeliveryAddress>) => {
    return apiClient<DeliveryAddress>(
      "/marketplace/student/delivery-addresses/",
      { method: "POST", body: JSON.stringify(data) }
    );
  },
  updateDeliveryAddress: async (id: number, data: Partial<DeliveryAddress>) => {
    return apiClient<DeliveryAddress>(
      `/marketplace/student/delivery-addresses/${id}/`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  },
  deleteDeliveryAddress: async (id: number) => {
    return apiClient(`/marketplace/student/delivery-addresses/${id}/`, {
      method: "DELETE",
    });
  },

  // Student - My Listings (seller)
  getMyListings: async () => {
    return apiClient<Product[]>("/marketplace/student/my-listings/");
  },
  createListing: async (data: FormData) => {
    return apiClient<Product>("/marketplace/student/my-listings/", {
      method: "POST",
      body: data,
    });
  },
  updateListing: async (id: number, data: FormData | Partial<Product>) => {
    const isFormData = data instanceof FormData;
    return apiClient<Product>(`/marketplace/student/my-listings/${id}/`, {
      method: "PATCH",
      body: isFormData ? (data as FormData) : JSON.stringify(data),
    });
  },
  deleteListing: async (id: number) => {
    return apiClient(`/marketplace/student/my-listings/${id}/`, {
      method: "DELETE",
    });
  },
  archiveListing: async (id: number) => {
    return apiClient<Product>(
      `/marketplace/student/my-listings/${id}/archive/`,
      { method: "POST" }
    );
  },
  resubmitListing: async (id: number) => {
    return apiClient<Product>(
      `/marketplace/student/my-listings/${id}/resubmit/`,
      { method: "POST" }
    );
  },

  // Student - My Sales (seller sees their sold orders)
  getMySales: async () => {
    return apiClient<SellerSale[]>("/marketplace/student/my-sales/");
  },

  // Student - Listing Reports
  reportListing: async (data: {
    listing: number;
    reason: string;
    description?: string;
  }) => {
    return apiClient<MarketplaceListingReport>(
      "/marketplace/student/listing-reports/",
      { method: "POST", body: JSON.stringify(data) }
    );
  },
  getMyReports: async () => {
    return apiClient<MarketplaceListingReport[]>(
      "/marketplace/student/listing-reports/"
    );
  },

  // Admin - Products
  adminGetProducts: async (params?: {
    listing_status?: string;
    is_seller_listing?: "true" | "false";
  }) => {
    const query = new URLSearchParams();
    if (params?.listing_status)
      query.append("listing_status", params.listing_status);
    if (params?.is_seller_listing)
      query.append("is_seller_listing", params.is_seller_listing);
    const qs = query.toString();
    return apiClient<Product[]>(
      `/marketplace/admin/products/${qs ? `?${qs}` : ""}`
    );
  },
  adminCreateProduct: async (data: FormData) => {
    return apiClient<Product>("/marketplace/admin/products/", {
      method: "POST",
      body: data,
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
  adminApproveListing: async (id: number) => {
    return apiClient<Product>(`/marketplace/admin/products/${id}/approve/`, {
      method: "POST",
    });
  },
  adminRejectListing: async (id: number, reason?: string) => {
    return apiClient<Product>(`/marketplace/admin/products/${id}/reject/`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
  adminArchiveListing: async (id: number) => {
    return apiClient<Product>(`/marketplace/admin/products/${id}/archive/`, {
      method: "POST",
    });
  },

  // Admin - Payment Methods
  adminGetPaymentMethods: async () => {
    return apiClient<PaymentMethod[]>("/marketplace/admin/payment-methods/");
  },
  adminUpdatePaymentMethod: async (
    id: number,
    data: FormData | Partial<PaymentMethod>
  ) => {
    const isFormData = data instanceof FormData;
    return apiClient<PaymentMethod>(
      `/marketplace/admin/payment-methods/${id}/`,
      {
        method: "PATCH",
        body: isFormData ? (data as FormData) : JSON.stringify(data),
      }
    );
  },
  adminCreatePaymentMethod: async (data: Partial<PaymentMethod>) => {
    return apiClient<PaymentMethod>("/marketplace/admin/payment-methods/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  adminDeletePaymentMethod: async (id: number) => {
    return apiClient(`/marketplace/admin/payment-methods/${id}/`, {
      method: "DELETE",
    });
  },

  // Admin - Payment Submissions
  adminGetSubmissions: async () => {
    return apiClient<PaymentSubmission[]>(
      "/marketplace/admin/payment-submissions/"
    );
  },
  adminReviewSubmission: async (
    id: number,
    status: "APPROVED" | "REJECTED",
    rejection_reason?: string
  ) => {
    return apiClient<PaymentSubmission>(
      `/marketplace/admin/payment-submissions/${id}/review/`,
      { method: "POST", body: JSON.stringify({ status, rejection_reason }) }
    );
  },

  // Admin - Purchases
  adminGetPurchases: async () => {
    return apiClient<Purchase[]>("/marketplace/admin/purchases/");
  },
  adminRevokePurchase: async (id: number) => {
    return apiClient<Purchase>(`/marketplace/admin/purchases/${id}/revoke/`, {
      method: "POST",
    });
  },
  adminReactivatePurchase: async (id: number) => {
    return apiClient<Purchase>(
      `/marketplace/admin/purchases/${id}/reactivate/`,
      { method: "POST" }
    );
  },

  // Admin - Overview
  adminGetOverview: async () => {
    return apiClient<MarketplaceOverview>("/admin/marketplace/");
  },

  // Admin - Delivery Fee Rules
  adminGetDeliveryFeeRules: async () => {
    return apiClient<DeliveryFeeRule[]>("/marketplace/admin/delivery-fees/");
  },
  adminCreateDeliveryFeeRule: async (data: Partial<DeliveryFeeRule>) => {
    return apiClient<DeliveryFeeRule>("/marketplace/admin/delivery-fees/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  adminUpdateDeliveryFeeRule: async (
    id: number,
    data: Partial<DeliveryFeeRule>
  ) => {
    return apiClient<DeliveryFeeRule>(
      `/marketplace/admin/delivery-fees/${id}/`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  },
  adminDeleteDeliveryFeeRule: async (id: number) => {
    return apiClient(`/marketplace/admin/delivery-fees/${id}/`, {
      method: "DELETE",
    });
  },

  // Admin - Orders
  adminGetOrders: async () => {
    return apiClient<Order[]>("/marketplace/admin/orders/");
  },
  adminUpdateOrderStatus: async (id: number, status: string, note?: string) => {
    return apiClient<Order>(`/marketplace/admin/orders/${id}/update_status/`, {
      method: "POST",
      body: JSON.stringify({ status, note }),
    });
  },
  adminUpdateOrderItemStatus: async (
    orderId: number,
    itemId: number,
    fulfillment_status?: string,
    payout_status?: string
  ) => {
    return apiClient<Order>(`/marketplace/admin/orders/${orderId}/update_item_status/`, {
      method: "POST",
      body: JSON.stringify({ item_id: itemId, fulfillment_status, payout_status }),
    });
  },

  // Admin - Marketplace Settings
  adminGetMarketplaceSettings: async () => {
    return apiClient<MarketplaceSettings>("/marketplace/admin/settings/");
  },
  adminUpdateMarketplaceSettings: async (
    data: Partial<MarketplaceSettings>
  ) => {
    return apiClient<MarketplaceSettings>("/marketplace/admin/settings/", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Admin - Listing Reports
  adminGetListingReports: async () => {
    return apiClient<MarketplaceListingReport[]>(
      "/marketplace/admin/listing-reports/"
    );
  },
  adminReviewListingReport: async (
    id: number,
    status: "REVIEWED" | "DISMISSED",
    admin_response?: string
  ) => {
    return apiClient<MarketplaceListingReport>(
      `/marketplace/admin/listing-reports/${id}/review/`,
      { method: "POST", body: JSON.stringify({ status, admin_response }) }
    );
  },

  // Student - Reviews
  getReviews: async () => {
    return apiClient<Review[]>("/marketplace/student/reviews/");
  },
  createReview: async (data: Partial<Review>) => {
    return apiClient<Review>("/marketplace/student/reviews/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  
  // Student - Disputes
  getDisputes: async () => {
    return apiClient<Dispute[]>("/marketplace/student/disputes/");
  },
  createDispute: async (data: Partial<Dispute>) => {
    return apiClient<Dispute>("/marketplace/student/disputes/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Admin - Reviews
  adminGetReviews: async () => {
    return apiClient<Review[]>("/marketplace/admin/reviews/");
  },
  adminUpdateReview: async (id: number, data: Partial<Review>) => {
    return apiClient<Review>(
      `/marketplace/admin/reviews/${id}/`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  },
  adminDeleteReview: async (id: number) => {
    return apiClient(`/marketplace/admin/reviews/${id}/`, { method: "DELETE" });
  },

  // Admin - Disputes
  adminGetDisputes: async () => {
    return apiClient<Dispute[]>("/marketplace/admin/disputes/");
  },
  adminResolveDispute: async (id: number, status: "RESOLVED" | "REJECTED", resolution: string) => {
    return apiClient<Dispute>(
      `/marketplace/admin/disputes/${id}/resolve/`,
      { method: "POST", body: JSON.stringify({ status, resolution }) }
    );
  },

};
