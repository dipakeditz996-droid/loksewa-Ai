import { apiClient } from "./client";

export interface StudentWallet {
  id: number;
  username: string;
  email: string;
  full_name?: string;
  balance: number;
  total_credited: number;
  total_debited: number;
  is_locked: boolean;
  lock_reason: string;
  last_transaction_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: number;
  transaction_type: "CREDIT" | "DEBIT" | "REFUND" | "REVERSAL" | "ADMIN_ADJUSTMENT";
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_type:
    | "TOPUP"
    | "XP_CONVERSION"
    | "REWARD"
    | "CONTENT_PURCHASE"
    | "REFUND"
    | "REVERSAL"
    | "ADMIN_ADJUSTMENT"
    | "LEGACY_MIGRATION";
  reference_id: string;
  idempotency_key?: string | null;
  description: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface GamificationProfileSummary {
  lifetime_xp: number;
  redeemable_xp: number;
  converted_xp: number;
  level: number;
}

export interface StudentWalletSummary {
  wallet: StudentWallet;
  gamification: GamificationProfileSummary;
  pending_topups_count: number;
  recent_transactions: WalletTransaction[];
}

export interface ActivePaymentMethod {
  id: number;
  method_type: string;
  display_name: string;
  account_name: string;
  account_number: string;
  bank_name?: string;
  branch?: string;
  qr_image?: string | null;
}

export interface TopUpConfig {
  enabled: boolean;
  npr_to_coin_rate: string | number;
  min_topup_npr: string | number;
  max_topup_npr: string | number;
  bonus_percentage: number;
  instructions: string;
  payment_methods: ActivePaymentMethod[];
  updated_at?: string;
}

export interface CoinTopUp {
  id: number;
  user_username: string;
  user_email: string;
  student_details?: {
    id: number;
    username: string;
    email: string;
    full_name: string;
  };
  amount_npr: string | number;
  coins_expected: number;
  bonus_coins: number;
  total_coins: number;
  payment_method?: number | null;
  payment_method_name?: string;
  payment_method_display?: string;
  payment_reference: string;
  receipt_image?: string | null;
  status: "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED" | "REFUNDED";
  verification_status:
    | "NOT_VERIFIED"
    | "VERIFICATION_IN_PROGRESS"
    | "VERIFIED_CONFIDENT"
    | "VERIFIED_UNCERTAIN"
    | "VERIFICATION_FAILED";
  verification_result?: {
    detected_amount?: string | null;
    detected_transaction_id?: string | null;
    detected_provider?: string | null;
    detected_recipient?: string | null;
    detected_date?: string | null;
    detected_status?: string | null;
    amount_matches?: boolean;
    transaction_id_matches?: boolean;
    receiver_matches?: boolean;
    is_duplicate_transaction?: boolean;
    is_duplicate_image?: boolean;
    failure_reasons?: string[];
    notes?: string;
    verification_data?: {
      ocr_confidence?: number;
      [key: string]: any;
    };
    admin_decision?: {
      action: string;
      admin_name: string;
      decided_at: string;
      reason?: string;
      notes?: string;
    };
    [key: string]: any;
  };
  ai_verification_at?: string | null;
  verified_at?: string | null;
  verified_by_username?: string | null;
  rejection_reason?: string;
  verification_notes?: string;
  wallet_transaction?: number | null;
  idempotency_key?: string | null;
  extracted_amount?: string | null;
  extracted_transaction_id?: string | null;
  detected_provider?: string | null;
  ocr_confidence?: number | null;
  provider_verification_result?: {
    detected_provider?: string | null;
    provider_detected?: boolean;
    detected_status?: string | null;
    receiver_matches?: boolean;
    detected_recipient?: string | null;
    bank_name?: string | null;
    receiver_bank?: string | null;
  };
  duplicate_warnings?: string[];
  failure_reasons?: string[];
  is_duplicate_transaction?: boolean;
  is_duplicate_image?: boolean;
  created_at: string;
  updated_at: string;
}

export interface XPConversionEligibility {
  enabled: boolean;
  conversion_mode: "MANUAL" | "AUTO" | "BOTH";
  current_rate: {
    xp_required: number;
    coins_awarded: number;
  };
  lifetime_xp: number;
  redeemable_xp: number;
  converted_xp: number;
  minimum_xp: number;
  maximum_xp: number;
  daily_conversion_limit: number;
  converted_today: number;
  remaining_today: number;
  is_eligible: boolean;
}

export interface XPConversionPreview {
  xp_requested: number;
  xp_effective_converted: number;
  coins_awarded: number;
  current_redeemable_xp: number;
  projected_redeemable_xp: number;
  conversion_rate: string;
}

export interface XPConversionLog {
  id: number;
  username: string;
  xp_converted: number;
  coins_awarded: number;
  conversion_rate_snapshot: string;
  wallet_transaction?: number | null;
  idempotency_key?: string | null;
  created_at: string;
}

export interface AdminWalletStats {
  total_wallets: number;
  total_coins_held: number;
  total_coins_credited: number;
  total_coins_debited: number;
  pending_topups: number;
  awaiting_review_topups: number;
  auto_verified_topups: number;
  manual_approved_topups: number;
  verified_topups: number;
  rejected_topups: number;
  refunded_topups: number;
  total_topups: number;
}

export interface AdminWalletDetail {
  wallet: StudentWallet;
  user_profile: {
    id: number;
    username: string;
    email: string;
    full_name: string;
    date_joined: string;
    is_active: boolean;
  };
  recent_transactions: WalletTransaction[];
  topups: CoinTopUp[];
  xp_conversions: XPConversionLog[];
  reward_claims: {
    id: number;
    activity_type: string;
    activity_name: string;
    activity_reference: string;
    coins_awarded: number;
    xp_awarded: number;
    wallet_transaction?: number | null;
    claimed_at: string;
  }[];
  content_entitlements: {
    id: number;
    content_type: string;
    content_type_display: string;
    content_id: number;
    coins_spent: number;
    wallet_transaction?: number | null;
    purchased_at: string;
    expires_at?: string | null;
    status: string;
    is_valid: boolean;
  }[];
}

export interface PaginatedResult<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ContentAccessEvaluation {
  has_access: boolean;
  access_type: "FREE" | "TRIAL" | "PACKAGE" | "ENTITLEMENT" | null;
  reason: string;
  can_purchase_with_coins: boolean;
  package_purchase_required: boolean;
  pricing?: {
    coin_price: number;
    access_duration_days: number;
    monetization_mode: "FREE" | "PACKAGE_ONLY" | "COIN_PURCHASE" | "PACKAGE_OR_COINS";
    is_enabled: boolean;
    is_permanent: boolean;
  } | null;
  content: {
    id: number;
    content_type: string;
    title: string;
    description: string;
    exists: boolean;
    status: string;
  };
  wallet_balance: number;
  wallet_locked?: boolean;
  can_afford?: boolean;
  coin_shortage?: number;
  remaining_balance_after_purchase?: number;
  entitlement?: {
    id: number;
    coins_spent: number;
    purchased_at: string;
    expires_at: string | null;
    is_permanent: boolean;
    status: string;
  } | null;
}

export interface PurchasedContentItem {
  id: number;
  content_type: "STUDY_MATERIAL" | "EXAMINATION" | "QUESTION_SET";
  content_type_display: string;
  content_id: number;
  content_title: string;
  content_description: string;
  coins_spent: number;
  wallet_transaction: number;
  purchased_at: string;
  expires_at: string | null;
  is_permanent: boolean;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  is_valid: boolean;
}

export interface ContentCoinPricingItem {
  id: number;
  content_type: "STUDY_MATERIAL" | "EXAMINATION" | "QUESTION_SET";
  content_type_display: string;
  content_id: number;
  content_title: string;
  coin_price: number;
  access_duration_days: number;
  monetization_mode: "FREE" | "PACKAGE_ONLY" | "COIN_PURCHASE" | "PACKAGE_OR_COINS";
  monetization_mode_display: string;
  is_enabled: boolean;
  total_purchases: number;
  total_coins_earned: number;
  active_entitlements_count: number;
  created_at: string;
  updated_at: string;
}

export interface MonetizationAnalytics {
  total_purchases: number;
  total_coins_earned: number;
  active_entitlements: number;
  by_type: Array<{
    content_type: string;
    count: number;
    total_coins: number;
  }>;
  top_purchased: Array<{
    content_type: string;
    content_id: number;
    title: string;
    purchase_count: number;
    coins_earned: number;
  }>;
}

export interface ContentPurchaseResult {
  success: boolean;
  already_owned?: boolean;
  idempotent_replay?: boolean;
  message: string;
  entitlement_id?: number;
  coins_spent?: number;
  wallet_balance: number;
  expires_at?: string | null;
  is_permanent?: boolean;
  content: {
    id: number;
    content_type: string;
    title: string;
    description: string;
    exists: boolean;
    status: string;
  };
  transaction_id?: number;
}

export const walletApi = {
  // Student endpoints
  async getWallet(): Promise<StudentWallet> {
    return apiClient<StudentWallet>("/wallet/");
  },

  async getSummary(): Promise<StudentWalletSummary> {
    return apiClient<StudentWalletSummary>("/wallet/summary/");
  },

  async getTransactions(params?: {
    type?: string;
    reference_type?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<WalletTransaction>> {
    const sp = new URLSearchParams();
    if (params?.type && params.type !== "ALL") sp.set("type", params.type);
    if (params?.reference_type && params.reference_type !== "ALL") sp.set("reference_type", params.reference_type);
    if (params?.search) sp.set("search", params.search);
    if (params?.start_date) sp.set("start_date", params.start_date);
    if (params?.end_date) sp.set("end_date", params.end_date);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.page_size) sp.set("page_size", String(params.page_size));

    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiClient<PaginatedResult<WalletTransaction>>(`/wallet/transactions/${query}`);
  },

  async getTopUpConfig(): Promise<TopUpConfig> {
    return apiClient<TopUpConfig>("/wallet/topup/config/");
  },

  async createTopUpRequest(data: {
    amount_npr: number;
    payment_method_id?: number;
    idempotency_key?: string;
  }): Promise<CoinTopUp> {
    return apiClient<CoinTopUp>("/wallet/topup/request/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async submitTopUpPayment(id: number, formData: FormData): Promise<CoinTopUp> {
    return apiClient<CoinTopUp>(`/wallet/topup/${id}/submit/`, {
      method: "POST",
      body: formData,
    });
  },

  async getTopUpStatus(id: number): Promise<CoinTopUp> {
    return apiClient<CoinTopUp>(`/wallet/topup/${id}/status/`);
  },

  async getStudentTopUps(params?: {
    status?: string;
    page?: number;
  }): Promise<PaginatedResult<CoinTopUp>> {
    const sp = new URLSearchParams();
    if (params?.status && params.status !== "ALL") sp.set("status", params.status);
    if (params?.page) sp.set("page", String(params.page));
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiClient<PaginatedResult<CoinTopUp>>(`/wallet/topups/${query}`);
  },

  async getXPEligibility(): Promise<XPConversionEligibility> {
    return apiClient<XPConversionEligibility>("/wallet/xp-conversion/eligibility/");
  },

  async previewXPConversion(xp_amount: number): Promise<XPConversionPreview> {
    return apiClient<XPConversionPreview>("/wallet/xp-conversion/preview/", {
      method: "POST",
      body: JSON.stringify({ xp_amount }),
    });
  },

  async submitXPConversion(data: {
    xp_amount: number;
    idempotency_key?: string;
  }): Promise<{
    conversion: XPConversionLog;
    wallet_balance: number;
    remaining_redeemable_xp: number;
    lifetime_xp: number;
  }> {
    return apiClient("/wallet/xp-conversion/submit/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getXPConversionHistory(page?: number): Promise<PaginatedResult<XPConversionLog>> {
    const query = page ? `?page=${page}` : "";
    return apiClient<PaginatedResult<XPConversionLog>>(`/wallet/xp-conversion/history/${query}`);
  },

  // Admin endpoints
  async getAdminStats(): Promise<AdminWalletStats> {
    return apiClient<AdminWalletStats>("/wallet/admin/stats/");
  },

  async getAdminWallets(params?: {
    search?: string;
    is_locked?: boolean | string;
    min_balance?: number;
    max_balance?: number;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<StudentWallet>> {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.is_locked !== undefined && params.is_locked !== "") {
      sp.set("is_locked", String(params.is_locked));
    }
    if (params?.min_balance !== undefined) sp.set("min_balance", String(params.min_balance));
    if (params?.max_balance !== undefined) sp.set("max_balance", String(params.max_balance));
    if (params?.page) sp.set("page", String(params.page));
    if (params?.page_size) sp.set("page_size", String(params.page_size));

    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiClient<PaginatedResult<StudentWallet>>(`/wallet/admin/wallets/${query}`);
  },

  async getAdminWalletDetail(id: number): Promise<AdminWalletDetail> {
    return apiClient<AdminWalletDetail>(`/wallet/admin/wallets/${id}/`);
  },

  async lockAdminWallet(
    id: number,
    data: { is_locked: boolean; reason?: string }
  ): Promise<{ detail: string; wallet: StudentWallet }> {
    return apiClient(`/wallet/admin/wallets/${id}/lock/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async adjustAdminWallet(
    id: number,
    data: {
      amount: number;
      adjustment_type: "CREDIT" | "DEBIT";
      reason: string;
      idempotency_key?: string;
    }
  ): Promise<{ transaction: WalletTransaction; wallet: StudentWallet }> {
    return apiClient(`/wallet/admin/wallets/${id}/adjust/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getAdminTopUps(params?: {
    status?: string;
    verification_status?: string;
    auto_verified?: boolean | string;
    method?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResult<CoinTopUp>> {
    const sp = new URLSearchParams();
    if (params?.status && params.status !== "ALL") sp.set("status", params.status);
    if (params?.verification_status && params.verification_status !== "ALL") {
      sp.set("verification_status", params.verification_status);
    }
    if (params?.auto_verified !== undefined && params.auto_verified !== "") {
      sp.set("auto_verified", String(params.auto_verified));
    }
    if (params?.method && params.method !== "ALL") sp.set("method", params.method);
    if (params?.search) sp.set("search", params.search);
    if (params?.page) sp.set("page", String(params.page));
    if (params?.page_size) sp.set("page_size", String(params.page_size));

    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiClient<PaginatedResult<CoinTopUp>>(`/wallet/admin/topups/${query}`);
  },

  async getAdminTopUpDetail(id: number): Promise<CoinTopUp> {
    return apiClient<CoinTopUp>(`/wallet/admin/topups/${id}/`);
  },

  async actionAdminTopUp(
    id: number,
    data: {
      action: "APPROVE" | "REJECT" | "REQUEST_CLEARER_RECEIPT";
      reason?: string;
      notes?: string;
    }
  ): Promise<{ detail: string; topup: CoinTopUp }> {
    return apiClient(`/wallet/admin/topups/${id}/action/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // --------------------------------------------------------------------------
  // Content Monetization & Purchase (Phase G)
  // --------------------------------------------------------------------------

  async checkContentAccess(
    contentType: "STUDY_MATERIAL" | "EXAMINATION" | "QUESTION_SET" | string,
    contentId: number
  ): Promise<ContentAccessEvaluation> {
    return apiClient<ContentAccessEvaluation>(
      `/wallet/content/access-check/?content_type=${encodeURIComponent(contentType)}&content_id=${encodeURIComponent(contentId)}`
    );
  },

  async purchaseContent(
    contentType: "STUDY_MATERIAL" | "EXAMINATION" | "QUESTION_SET" | string,
    contentId: number,
    idempotencyKey?: string
  ): Promise<ContentPurchaseResult> {
    return apiClient<ContentPurchaseResult>(`/wallet/content/purchase/`, {
      method: "POST",
      body: JSON.stringify({
        content_type: contentType,
        content_id: contentId,
        idempotency_key: idempotencyKey,
      }),
    });
  },

  async getPurchasedContent(params?: {
    content_type?: string;
    status?: string;
    page?: number;
  }): Promise<PaginatedResult<PurchasedContentItem>> {
    const sp = new URLSearchParams();
    if (params?.content_type && params.content_type !== "ALL") {
      sp.set("content_type", params.content_type);
    }
    if (params?.status && params.status !== "ALL") {
      sp.set("status", params.status);
    }
    if (params?.page) sp.set("page", String(params.page));
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiClient<PaginatedResult<PurchasedContentItem>>(`/wallet/content/purchased/${query}`);
  },

  async getAdminContentPricing(params?: {
    content_type?: string;
    monetization_mode?: string;
    is_enabled?: boolean;
    search?: string;
    page?: number;
  }): Promise<PaginatedResult<ContentCoinPricingItem>> {
    const sp = new URLSearchParams();
    if (params?.content_type && params.content_type !== "ALL") {
      sp.set("content_type", params.content_type);
    }
    if (params?.monetization_mode && params.monetization_mode !== "ALL") {
      sp.set("monetization_mode", params.monetization_mode);
    }
    if (params?.is_enabled !== undefined) {
      sp.set("is_enabled", String(params.is_enabled));
    }
    if (params?.search) {
      sp.set("search", params.search);
    }
    if (params?.page) sp.set("page", String(params.page));
    const query = sp.toString() ? `?${sp.toString()}` : "";
    return apiClient<PaginatedResult<ContentCoinPricingItem>>(`/wallet/admin/content-pricing/${query}`);
  },

  async saveAdminContentPricing(data: {
    content_type: string;
    content_id: number;
    coin_price: number;
    access_duration_days: number;
    monetization_mode: string;
    is_enabled: boolean;
  }): Promise<ContentCoinPricingItem> {
    return apiClient<ContentCoinPricingItem>(`/wallet/admin/content-pricing/`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async bulkUpdateAdminContentPricing(
    payload: {
      content_type?: string;
      coin_price?: number;
      access_duration_days?: number;
      monetization_mode?: string;
      is_enabled?: boolean;
      items?: Array<{
        content_type: string;
        content_id: number;
        coin_price?: number;
        access_duration_days?: number;
        monetization_mode?: string;
        is_enabled?: boolean;
      }>;
    } | Array<{
      content_type: string;
      content_id: number;
      coin_price?: number;
      access_duration_days?: number;
      monetization_mode?: string;
      is_enabled?: boolean;
    }>
  ): Promise<{ detail: string; updated_count: number }> {
    const body = Array.isArray(payload) ? { items: payload } : payload;
    return apiClient(`/wallet/admin/content-pricing/bulk-update/`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getAdminMonetizationAnalytics(): Promise<MonetizationAnalytics> {
    return apiClient<MonetizationAnalytics>(`/wallet/admin/monetization-analytics/`);
  },
};
