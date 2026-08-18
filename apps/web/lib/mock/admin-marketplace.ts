export interface MockStudentRef {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar?: string;
}

export interface MockProduct {
  id: string;
  name: string;
  category: string;
  type: string;
  price: number;
  discountPrice?: number;
  status: "Draft" | "Published" | "Hidden" | "Archived";
  purchases: number;
  revenue: number;
  updatedAt: string;
}

export interface MockOrder {
  id: string;
  orderId: string;
  student: MockStudentRef;
  productId: string;
  productName: string;
  amount: number;
  paymentStatus: "Pending" | "Submitted" | "Approved" | "Rejected" | "Refunded";
  orderStatus: "Pending" | "Processing" | "Completed" | "Cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface MockPayment {
  id: string;
  transactionId: string;
  orderId: string;
  student: MockStudentRef;
  productName: string;
  amount: number;
  paymentMethod: "eSewa" | "Khalti" | "Bank Transfer";
  transactionCode: string;
  screenshotUrl?: string;
  submittedAt: string;
  status: "Pending Review" | "Approved" | "Rejected" | "Needs Review";
  rejectionReason?: string;
}

export interface MockPaymentMethod {
  id: string;
  name: string;
  provider: "eSewa" | "Khalti" | "Bank Transfer";
  accountName: string;
  accountId: string; // Phone number or account number
  qrUrl?: string;
  instructions: string;
  status: "Active" | "Inactive";
  order: number;
  bankName?: string;
  branchName?: string;
}

export const mockMarketplaceAnalytics = {
  totalProducts: 45,
  publishedProducts: 38,
  totalOrders: 1250,
  pendingPayments: 24,
  approvedPayments: 1180,
  totalRevenue: 1545000,
  revenueToday: 12500
};

export const mockProducts: MockProduct[] = [
  {
    id: "prod-1",
    name: "Section Officer 30-Day Crash Course",
    category: "Loksewa",
    type: "Course",
    price: 2500,
    discountPrice: 1500,
    status: "Published",
    purchases: 450,
    revenue: 675000,
    updatedAt: "2026-08-10T10:00:00Z"
  },
  {
    id: "prod-2",
    name: "Banking Preparation Mock Test Series",
    category: "Banking",
    type: "Mock Exam",
    price: 500,
    status: "Published",
    purchases: 820,
    revenue: 410000,
    updatedAt: "2026-08-12T09:30:00Z"
  },
  {
    id: "prod-3",
    name: "Complete GK & IQ Notes (PDF)",
    category: "Study Material",
    type: "PDF",
    price: 300,
    discountPrice: 200,
    status: "Published",
    purchases: 1200,
    revenue: 240000,
    updatedAt: "2026-08-14T08:00:00Z"
  },
  {
    id: "prod-4",
    name: "Teacher Service Commission - Full Pack",
    category: "Teacher Service",
    type: "Premium Study Plan",
    price: 3500,
    status: "Draft",
    purchases: 0,
    revenue: 0,
    updatedAt: "2026-08-15T11:00:00Z"
  }
];

export const mockOrders: MockOrder[] = [
  {
    id: "ord-1001",
    orderId: "ORD-20260815-1001",
    student: {
      id: "std-849",
      name: "Ramesh Sharma",
      email: "ramesh.sharma@example.com",
      username: "ramesh99",
    },
    productId: "prod-1",
    productName: "Section Officer 30-Day Crash Course",
    amount: 1500,
    paymentStatus: "Submitted",
    orderStatus: "Processing",
    createdAt: "2026-08-15T09:15:00Z",
    updatedAt: "2026-08-15T09:18:00Z"
  },
  {
    id: "ord-1002",
    orderId: "ORD-20260815-1002",
    student: {
      id: "std-421",
      name: "Sita Thapa",
      email: "sita.thapa@example.com",
      username: "sita_t",
    },
    productId: "prod-2",
    productName: "Banking Preparation Mock Test Series",
    amount: 500,
    paymentStatus: "Approved",
    orderStatus: "Completed",
    createdAt: "2026-08-14T14:20:00Z",
    updatedAt: "2026-08-14T15:10:00Z"
  },
  {
    id: "ord-1003",
    orderId: "ORD-20260815-1003",
    student: {
      id: "std-992",
      name: "Hari Kumar",
      email: "hari.kumar@example.com",
      username: "hari_k",
    },
    productId: "prod-3",
    productName: "Complete GK & IQ Notes (PDF)",
    amount: 200,
    paymentStatus: "Rejected",
    orderStatus: "Cancelled",
    createdAt: "2026-08-13T11:00:00Z",
    updatedAt: "2026-08-13T11:45:00Z"
  }
];

export const mockPayments: MockPayment[] = [
  {
    id: "pay-1001",
    transactionId: "TXN-0001",
    orderId: "ORD-20260815-1001",
    student: mockOrders[0]!.student,
    productName: "Section Officer 30-Day Crash Course",
    amount: 1500,
    paymentMethod: "eSewa",
    transactionCode: "ES-987654321AB",
    screenshotUrl: "https://images.unsplash.com/photo-1615416200236-47a32ab500e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    submittedAt: "2026-08-15T09:18:00Z",
    status: "Pending Review"
  },
  {
    id: "pay-1002",
    transactionId: "TXN-0002",
    orderId: "ORD-20260815-1002",
    student: mockOrders[1]!.student,
    productName: "Banking Preparation Mock Test Series",
    amount: 500,
    paymentMethod: "Khalti",
    transactionCode: "KHL-ABC123XYZ",
    screenshotUrl: "https://images.unsplash.com/photo-1556740758-90de374c12ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    submittedAt: "2026-08-14T14:25:00Z",
    status: "Approved"
  },
  {
    id: "pay-1003",
    transactionId: "TXN-0003",
    orderId: "ORD-20260815-1003",
    student: mockOrders[2]!.student,
    productName: "Complete GK & IQ Notes (PDF)",
    amount: 200,
    paymentMethod: "Bank Transfer",
    transactionCode: "NIBL-0019283746",
    screenshotUrl: "https://images.unsplash.com/photo-1589758438368-0c5364c633a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80",
    submittedAt: "2026-08-13T11:10:00Z",
    status: "Rejected",
    rejectionReason: "Invalid Screenshot"
  }
];

export const mockPaymentMethods: MockPaymentMethod[] = [
  {
    id: "pm-1",
    name: "Pay via eSewa",
    provider: "eSewa",
    accountName: "LoksewaAI Official",
    accountId: "9841234567",
    qrUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg",
    instructions: "Please send the exact amount to our eSewa ID and upload the success screenshot.",
    status: "Active",
    order: 1
  },
  {
    id: "pm-2",
    name: "Pay via Khalti",
    provider: "Khalti",
    accountName: "LoksewaAI Edu",
    accountId: "9801234567",
    qrUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg",
    instructions: "Transfer to our Khalti account and submit the 11-digit transaction code.",
    status: "Active",
    order: 2
  },
  {
    id: "pm-3",
    name: "Direct Bank Transfer",
    provider: "Bank Transfer",
    bankName: "Global IME Bank",
    branchName: "Kantipath",
    accountName: "LoksewaAI Pvt Ltd",
    accountId: "01010101010101",
    qrUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg",
    instructions: "Deposit the amount and upload the deposit slip or mobile banking transfer screenshot.",
    status: "Inactive",
    order: 3
  }
];
