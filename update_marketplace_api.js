import fs from 'fs';

const filePath = 'apps/web/lib/api/marketplace.ts';
let content = fs.readFileSync(filePath, 'utf-8');

const interfaces = `
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
`;

// Insert interfaces before "export const marketplaceApi = {"
content = content.replace('export const marketplaceApi = {', interfaces + '\nexport const marketplaceApi = {');

const methods = `
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
      \`/marketplace/admin/reviews/\${id}/\`,
      { method: "PATCH", body: JSON.stringify(data) }
    );
  },

  // Admin - Disputes
  adminGetDisputes: async () => {
    return apiClient<Dispute[]>("/marketplace/admin/disputes/");
  },
  adminResolveDispute: async (id: number, status: "RESOLVED" | "REJECTED", resolution: string) => {
    return apiClient<Dispute>(
      \`/marketplace/admin/disputes/\${id}/resolve/\`,
      { method: "POST", body: JSON.stringify({ status, resolution }) }
    );
  },
`;

// Insert methods before the final "};"
content = content.replace(/};\s*$/, methods + '\n};\n');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Appended to marketplace.ts');
