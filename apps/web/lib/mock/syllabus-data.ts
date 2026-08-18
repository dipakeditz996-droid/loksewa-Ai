export type TopicStatus = "completed" | "in-progress" | "not-started";

export interface Topic {
  id: string;
  title: string;
  status: TopicStatus;
  progress: number;
  accuracy: number | null;
}

export interface Unit {
  id: string;
  title: string;
  topics: Topic[];
}

export interface Subject {
  id: string;
  title: string;
  progress: number;
  description: string;
  units: Unit[];
}

export interface Exam {
  id: string;
  title: string;
  subjects: Subject[];
}

export const mockExams: Exam[] = [
  {
    id: "e1",
    title: "Section Officer",
    subjects: [
      {
        id: "s1",
        title: "Public Administration",
        progress: 78,
        description: "Covers the fundamental principles, evolution, and modern practices of public administration in the context of Nepal.",
        units: [
          {
            id: "u1",
            title: "UNIT 01: Introduction to Public Administration",
            topics: [
              { id: "t1", title: "01. Concept and Scope", status: "completed", progress: 100, accuracy: 85 },
              { id: "t2", title: "02. Evolution of Public Administration", status: "completed", progress: 100, accuracy: 72 },
              { id: "t3", title: "03. Principles of Organization", status: "in-progress", progress: 45, accuracy: 61 },
              { id: "t4", title: "04. Public Organizations", status: "not-started", progress: 0, accuracy: null },
              { id: "t5", title: "05. Administrative Behaviour", status: "not-started", progress: 0, accuracy: null },
            ]
          },
          {
            id: "u2",
            title: "UNIT 02: Personnel Administration",
            topics: [
              { id: "t6", title: "01. Civil Service Systems", status: "completed", progress: 100, accuracy: 90 },
              { id: "t7", title: "02. Recruitment and Selection", status: "in-progress", progress: 60, accuracy: 65 },
              { id: "t8", title: "03. Training and Development", status: "not-started", progress: 0, accuracy: null },
            ]
          }
        ]
      },
      {
        id: "s2",
        title: "Constitution",
        progress: 64,
        description: "In-depth study of the Constitution of Nepal, fundamental rights, duties, and state directives.",
        units: [
          {
            id: "u3",
            title: "UNIT 01: Constitutional History",
            topics: [
              { id: "t9", title: "01. Early Constitutional Developments", status: "completed", progress: 100, accuracy: 88 },
              { id: "t10", title: "02. Constitution of Nepal 2072", status: "in-progress", progress: 75, accuracy: 58 },
            ]
          }
        ]
      },
      {
        id: "s3",
        title: "Current Affairs",
        progress: 91,
        description: "Recent national and international events, global politics, and major socio-economic developments.",
        units: [
          {
            id: "u4",
            title: "UNIT 01: National Events",
            topics: [
              { id: "t11", title: "01. Economic Developments", status: "completed", progress: 100, accuracy: 95 },
              { id: "t12", title: "02. Political Changes", status: "completed", progress: 100, accuracy: 92 },
            ]
          },
          {
            id: "u5",
            title: "UNIT 02: International Relations",
            topics: [
              { id: "t13", title: "01. UN and International Bodies", status: "in-progress", progress: 80, accuracy: 64 },
              { id: "t14", title: "02. Global Treaties", status: "not-started", progress: 0, accuracy: null },
            ]
          }
        ]
      },
      {
        id: "s4",
        title: "General Knowledge",
        progress: 72,
        description: "Geography, history, culture, and basic science related to Nepal and the world.",
        units: []
      },
      { id: "s5", title: "Governance", progress: 30, description: "Governance frameworks.", units: [] },
      { id: "s6", title: "Economy", progress: 10, description: "Economic systems.", units: [] },
      { id: "s7", title: "Management", progress: 0, description: "Management principles.", units: [] },
    ]
  },
  {
    id: "e2",
    title: "Nayab Subba",
    subjects: [
      { id: "s8", title: "General Awareness", progress: 20, description: "Basic GK.", units: [] },
    ]
  }
];

export const getExamById = (id: string) => mockExams.find((e) => e.id === id);
