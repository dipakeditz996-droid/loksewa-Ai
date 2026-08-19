export type EntityStatus = "Draft" | "Published" | "Archived" | "Active" | "Inactive";

export interface MockExam {
  id: string;
  name: string;
  shortName: string;
  level: string;
  description: string;
  type: string;
  thumbnail: string;
  status: EntityStatus;
  isFeaturedHome: boolean;
  isFeaturedSyllabus: boolean;
  sortOrder: number;
}

export interface MockPaper {
  id: string;
  examId: string;
  name: string;
  paperNumber: string; // e.g., "Paper I"
  description: string;
  sortOrder: number;
  status: EntityStatus;
}

export interface MockSubject {
  id: string;
  paperId: string;
  name: string;
  code: string;
  description: string;
  sortOrder: number;
  status: EntityStatus;
  categoryIds?: string[];
}

export interface MockChapter {
  id: string;
  subjectId: string;
  name: string;
  chapterNumber: number;
  description: string;
  sortOrder: number;
  order?: number;
  topicsCount?: number;
  questionsCount?: number;
  status: EntityStatus;
}

export interface MockTopic {
  id: string;
  chapterId: string;
  name: string;
  topicCode: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  sortOrder: number;
  order?: number;
  status: EntityStatus;
  subjectId?: string;
  questionsCount?: number;
}

// -------------------------------------------------------------
// SEED DATA
// -------------------------------------------------------------

export const mockExamCategories: any[] = [];
export const mockPositions: any[] = [];

export const mockExams: MockExam[] = [
  {
    id: "ex1",
    name: "Section Officer",
    shortName: "SO",
    level: "Gazetted Third Class",
    description: "Administrative head at section level in federal and provincial civil service.",
    type: "Civil Service",
    thumbnail: "bg-blue-600",
    status: "Published",
    isFeaturedHome: true,
    isFeaturedSyllabus: true,
    sortOrder: 1
  },
  {
    id: "ex2",
    name: "Nayab Subba",
    shortName: "NaSu",
    level: "Non-Gazetted First Class",
    description: "First class non-gazetted officer in civil service.",
    type: "Civil Service",
    thumbnail: "bg-emerald-600",
    status: "Published",
    isFeaturedHome: true,
    isFeaturedSyllabus: true,
    sortOrder: 2
  },
  {
    id: "ex3",
    name: "Kharidar",
    shortName: "Kharidar",
    level: "Non-Gazetted Second Class",
    description: "Second class non-gazetted officer.",
    type: "Civil Service",
    thumbnail: "bg-purple-600",
    status: "Published",
    isFeaturedHome: false,
    isFeaturedSyllabus: true,
    sortOrder: 3
  }
];

export const mockPapers: MockPaper[] = [
  {
    id: "p1",
    examId: "ex1",
    name: "General Knowledge and General Awareness",
    paperNumber: "Paper I",
    description: "First paper covering IQ, GK, and current affairs.",
    sortOrder: 1,
    status: "Published"
  },
  {
    id: "p2",
    examId: "ex1",
    name: "Public Administration",
    paperNumber: "Paper II",
    description: "Second paper covering administrative concepts.",
    sortOrder: 2,
    status: "Published"
  },
  {
    id: "p3",
    examId: "ex1",
    name: "Service Related Subject",
    paperNumber: "Paper III",
    description: "Third paper focusing on service-specific knowledge.",
    sortOrder: 3,
    status: "Published"
  }
];

export const mockSubjects: MockSubject[] = [
  {
    id: "sub1",
    paperId: "p1",
    name: "General Knowledge",
    code: "GK-101",
    description: "Geography, History, Culture, and Ecosystems.",
    sortOrder: 1,
    status: "Published"
  },
  {
    id: "sub2",
    paperId: "p1",
    name: "General Mental Ability Test",
    code: "IQ-101",
    description: "Verbal and non-verbal reasoning.",
    sortOrder: 2,
    status: "Published"
  },
  {
    id: "sub3",
    paperId: "p2",
    name: "Constitution of Nepal",
    code: "CN-201",
    description: "Detailed study of the Constitution and governance.",
    sortOrder: 1,
    status: "Published"
  },
  {
    id: "sub4",
    paperId: "p2",
    name: "Public Management",
    code: "PM-201",
    description: "Principles of office management and public service delivery.",
    sortOrder: 2,
    status: "Published"
  }
];

export const mockChapters: MockChapter[] = [
  {
    id: "ch1",
    subjectId: "sub3",
    name: "Constitutional Development",
    chapterNumber: 1,
    description: "History of constitutions in Nepal.",
    sortOrder: 1,
    status: "Published"
  },
  {
    id: "ch2",
    subjectId: "sub3",
    name: "Fundamental Rights",
    chapterNumber: 2,
    description: "Rights, duties, and state policies.",
    sortOrder: 2,
    status: "Published"
  },
  {
    id: "ch3",
    subjectId: "sub3",
    name: "Federal Structure",
    chapterNumber: 3,
    description: "Distribution of state powers.",
    sortOrder: 3,
    status: "Published"
  }
];

export const mockTopics: MockTopic[] = [
  {
    id: "t1",
    chapterId: "ch2",
    name: "Right to Equality",
    topicCode: "FR-01",
    description: "Article 18 details.",
    difficulty: "Medium",
    sortOrder: 1,
    status: "Published"
  },
  {
    id: "t2",
    chapterId: "ch2",
    name: "Right to Freedom",
    topicCode: "FR-02",
    description: "Article 17 details.",
    difficulty: "Hard",
    sortOrder: 2,
    status: "Published"
  },
  {
    id: "t3",
    chapterId: "ch2",
    name: "Right against Exploitation",
    topicCode: "FR-03",
    description: "Article 29 details.",
    difficulty: "Easy",
    sortOrder: 3,
    status: "Published"
  }
];

export interface MockTag {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  status: "Active" | "Inactive";
}

export const mockTags: MockTag[] = [
  { id: "tag1", name: "Constitution", color: "blue", usageCount: 142, status: "Active" },
  { id: "tag2", name: "Economy", color: "emerald", usageCount: 98, status: "Active" },
  { id: "tag3", name: "History", color: "amber", usageCount: 75, status: "Active" },
  { id: "tag4", name: "Geography", color: "green", usageCount: 63, status: "Active" },
  { id: "tag5", name: "Current Affairs", color: "purple", usageCount: 201, status: "Active" },
  { id: "tag6", name: "Public Administration", color: "indigo", usageCount: 87, status: "Active" },
  { id: "tag7", name: "Science & Technology", color: "cyan", usageCount: 54, status: "Active" },
  { id: "tag8", name: "Arithmetic", color: "rose", usageCount: 110, status: "Active" },
  { id: "tag9", name: "Logical Reasoning", color: "orange", usageCount: 92, status: "Inactive" },
  { id: "tag10", name: "Nepal Government", color: "teal", usageCount: 38, status: "Active" },
];
