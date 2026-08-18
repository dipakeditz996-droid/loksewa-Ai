export interface Question {
  id: string;
  examId: string;
  subject: string;
  topic: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: "Easy" | "Medium" | "Hard";
}

export const practiceQuestions: Question[] = [
  {
    id: "q1",
    examId: "e1",
    subject: "Constitution",
    topic: "Fundamental Rights",
    questionText: "Which article of the Constitution of Nepal deals with the right to equality?",
    options: ["Article 14", "Article 16", "Article 18", "Article 20"],
    correctAnswer: 2,
    explanation: "Article 18 of the Constitution of Nepal 2072 deals with the Right to Equality.",
    difficulty: "Medium",
  },
  {
    id: "q2",
    examId: "e1",
    subject: "Political History",
    topic: "Constitutional Development",
    questionText: "The Interim Government of Nepal Act was promulgated in which year?",
    options: ["2007 BS", "2015 BS", "2019 BS", "2047 BS"],
    correctAnswer: 0,
    explanation: "The Interim Government of Nepal Act 2007 BS was promulgated after the political change of 2007 BS.",
    difficulty: "Easy",
  },
  {
    id: "q3",
    examId: "e1",
    subject: "Geography",
    topic: "Physical Features",
    questionText: "Which is the largest lake in Nepal by surface area?",
    options: ["Phewa Lake", "Rara Lake", "Begnas Lake", "Tilicho Lake"],
    correctAnswer: 1,
    explanation: "Rara Lake is the largest lake in Nepal.",
    difficulty: "Easy",
  },
  {
    id: "q4",
    examId: "e1",
    subject: "Constitution",
    topic: "Constitutional Bodies",
    questionText: "The Public Service Commission of Nepal was established under which article?",
    options: ["Article 232", "Article 234", "Article 236", "Article 242"],
    correctAnswer: 1,
    explanation: "The Public Service Commission is established under Article 234 of the Constitution of Nepal 2072.",
    difficulty: "Hard",
  },
  {
    id: "q5",
    examId: "e1",
    subject: "Governance",
    topic: "Planning",
    questionText: "Which development plan of Nepal first introduced the concept of decentralization?",
    options: ["Third Five Year Plan", "Fourth Five Year Plan", "Fifth Five Year Plan", "Sixth Five Year Plan"],
    correctAnswer: 2,
    explanation: "The Fifth Five Year Plan first introduced the concept of decentralization.",
    difficulty: "Hard",
  },
  {
    id: "q6",
    examId: "e1",
    subject: "Public Administration",
    topic: "Local Government",
    questionText: "How many local levels are there in Nepal?",
    options: ["744", "753", "761", "777"],
    correctAnswer: 1,
    explanation: "There are currently 753 local levels in Nepal.",
    difficulty: "Easy",
  },
  {
    id: "q7",
    examId: "e1",
    subject: "Public Administration",
    topic: "Civil Service Act",
    questionText: "What is the retirement age for civil servants in Nepal according to the Civil Service Act?",
    options: ["58 years", "60 years", "63 years", "65 years"],
    correctAnswer: 0,
    explanation: "The retirement age is 58 years under the current Civil Service Act, though amendments to 60 have been proposed.",
    difficulty: "Medium",
  },
  {
    id: "q8",
    examId: "e1",
    subject: "Governance",
    topic: "Anti-Corruption",
    questionText: "When was the Commission for the Investigation of Abuse of Authority (CIAA) established?",
    options: ["2034 BS", "2047 BS", "2059 BS", "2063 BS"],
    correctAnswer: 1,
    explanation: "The CIAA was established in 2047 BS (1990 AD).",
    difficulty: "Medium",
  },
  {
    id: "q9",
    examId: "e1",
    subject: "Geography",
    topic: "Climate",
    questionText: "Which region of Nepal receives the highest rainfall?",
    options: ["Mustang", "Pokhara", "Kathmandu", "Biratnagar"],
    correctAnswer: 1,
    explanation: "Lumle in Pokhara receives the highest rainfall in Nepal.",
    difficulty: "Easy",
  },
  {
    id: "q10",
    examId: "e1",
    subject: "Political History",
    topic: "Treaties",
    questionText: "When was the Sugauli Treaty signed?",
    options: ["1814 AD", "1815 AD", "1816 AD", "1846 AD"],
    correctAnswer: 2,
    explanation: "The Sugauli Treaty was signed on March 4, 1816.",
    difficulty: "Medium",
  }
];
