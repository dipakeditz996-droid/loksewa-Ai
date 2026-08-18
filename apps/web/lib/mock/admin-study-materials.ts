export type MaterialType = "PDF" | "Notes" | "Book" | "Lecture Notes" | "Short Notes" | "Revision Notes" | "Model Set" | "Solution" | "Reference Material" | "Video" | "Audio" | "Other";
export type AccessType = "Free" | "Premium";
export type MaterialStatus = "Published" | "Draft" | "Archived" | "Scheduled";
export type DifficultyLevel = "Easy" | "Medium" | "Hard" | "Mixed" | "Not Applicable";

export interface StudyMaterial {
  id: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  subject: string;
  chapter?: string;
  topic?: string;
  targetExam?: string;
  targetPosition?: string;
  type: MaterialType;
  access: AccessType;
  status: MaterialStatus;
  difficulty: DifficultyLevel;
  tags: string[];
  author: string;
  
  // File details
  fileName: string;
  fileSize: string; // e.g., "2.4 MB"
  fileUrl: string;
  thumbnailUrl?: string;
  pageCount?: number;
  duration?: string; // e.g., "45:30" for video/audio
  
  // Stats
  views: number;
  downloads: number;
  uniqueStudents: number;
  averageRating: number;
  totalRatings: number;
  
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface MaterialCollection {
  id: string;
  name: string;
  description: string;
  materialIds: string[];
  status: "Published" | "Draft";
  createdAt: string;
}

export interface MaterialCategory {
  id: string;
  name: string;
  materialCount: number;
  status: "Active" | "Inactive";
}

export const mockMaterialCategories: MaterialCategory[] = [
  { id: "CAT-1", name: "Constitution & Law", materialCount: 45, status: "Active" },
  { id: "CAT-2", name: "General Knowledge (GK)", materialCount: 120, status: "Active" },
  { id: "CAT-3", name: "IQ & Reasoning", materialCount: 85, status: "Active" },
  { id: "CAT-4", name: "Public Management", materialCount: 34, status: "Active" },
  { id: "CAT-5", name: "Economics", materialCount: 28, status: "Active" }
];

export const mockMaterialCollections: MaterialCollection[] = [
  {
    id: "COL-1",
    name: "Loksewa Constitution Complete Notes",
    description: "A comprehensive guide to the Constitution of Nepal with detailed explanations.",
    materialIds: ["MAT-101", "MAT-102"],
    status: "Published",
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: "COL-2",
    name: "Section Officer Premium Pack",
    description: "Exclusive study materials for Section Officer preparation.",
    materialIds: ["MAT-103", "MAT-104"],
    status: "Published",
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString()
  }
];

export const mockStudyMaterials: StudyMaterial[] = [
  {
    id: "MAT-101",
    title: "Fundamental Rights (Part 3)",
    shortDescription: "Detailed notes on Fundamental Rights and Duties.",
    fullDescription: "<h3>Introduction</h3><p>This material covers all the 31 fundamental rights mentioned in Part 3 of the Constitution of Nepal.</p>",
    subject: "Constitution of Nepal",
    chapter: "Part 3: Fundamental Rights and Duties",
    topic: "Fundamental Rights",
    targetExam: "Lok Sewa Aayog",
    targetPosition: "Section Officer",
    type: "Notes",
    access: "Free",
    status: "Published",
    difficulty: "Medium",
    tags: ["constitution", "fundamental-rights", "important"],
    author: "LoksewaAI Content Team",
    fileName: "fundamental_rights_notes.pdf",
    fileSize: "1.2 MB",
    fileUrl: "/mock-files/fundamental_rights_notes.pdf",
    pageCount: 15,
    views: 4520,
    downloads: 1240,
    uniqueStudents: 3200,
    averageRating: 4.8,
    totalRatings: 342,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    publishedAt: new Date(Date.now() - 86400000 * 28).toISOString(),
  },
  {
    id: "MAT-102",
    title: "Directive Principles of State Policy",
    shortDescription: "Summary of Part 4 of the Constitution.",
    fullDescription: "<p>A quick revision guide for the Directive Principles, Policies and Responsibilities of the State.</p>",
    subject: "Constitution of Nepal",
    chapter: "Part 4: Directive Principles",
    targetExam: "Lok Sewa Aayog",
    targetPosition: "Nayab Subba",
    type: "Revision Notes",
    access: "Premium",
    status: "Published",
    difficulty: "Easy",
    tags: ["constitution", "revision"],
    author: "Suman Nepal",
    fileName: "directive_principles_revision.pdf",
    fileSize: "0.8 MB",
    fileUrl: "/mock-files/directive_principles_revision.pdf",
    pageCount: 5,
    views: 1250,
    downloads: 800,
    uniqueStudents: 950,
    averageRating: 4.5,
    totalRatings: 120,
    createdAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 15).toISOString(),
    publishedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    id: "MAT-103",
    title: "Geography of Nepal - Complete Video Lecture",
    shortDescription: "In-depth video lecture covering the physical geography of Nepal.",
    fullDescription: "<p>This 2-hour lecture covers mountains, hills, terai, river systems, and climate zones.</p>",
    subject: "General Knowledge",
    chapter: "Geography of Nepal",
    type: "Video",
    access: "Premium",
    status: "Draft",
    difficulty: "Medium",
    tags: ["geography", "gk", "video"],
    author: "External Expert",
    fileName: "geography_nepal_lecture.mp4",
    fileSize: "450 MB",
    fileUrl: "/mock-files/geography_nepal_lecture.mp4",
    duration: "02:15:30",
    views: 0,
    downloads: 0,
    uniqueStudents: 0,
    averageRating: 0,
    totalRatings: 0,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  }
];

export const mockMaterialAnalytics = {
  totalMaterials: 842,
  published: 790,
  drafts: 40,
  archived: 12,
  premium: 320,
  free: 522,
  totalViews: 1250000,
  totalDownloads: 450000,
  topSubject: "General Knowledge",
  recentlyAdded: 15 // in last 7 days
};
