/**
 * Utility functions for numeric-aware ascending sorting of study material / topicwise note cards.
 *
 * Ensures notes are displayed in ascending numerical order (e.g. 1, 2, 3, ... 10)
 * based on their existing order/sequence field or the leading sequence number in their title.
 */

export interface SortableNote {
  id?: number | string | null;
  title?: string | null;
  order?: number | null;
  sequence?: number | null;
  created_at?: string | null;
  createdAt?: string | null;
}

/**
 * Safely extracts a leading numeric sequence number from a note title.
 * Examples:
 *   "1. Engineering Surveying – Notes by Iswor Rawat" -> 1
 *   "2. Construction Materials - Notes by Iswor Rawat" -> 2
 *   "03. Mechanics of Materials" -> 3
 *   "10. Fluid Mechanics" -> 10
 *   "Chapter 4: Soil Mechanics" -> 4
 *   "Topic 5.1 Hydrology" -> 5.1
 *   "Unit 6 - Environmental Engineering" -> 6
 *   "[7] Structural Analysis" -> 7
 */
export function extractLeadingNumber(title?: string | null): number | null {
  if (!title || typeof title !== "string") return null;
  const trimmed = title.trim();

  // 1. Prefix pattern: "Chapter 1", "Topic 2", "Unit 3", "Section 4", "Part 5", "No. 6"
  const prefixMatch = trimmed.match(
    /^(?:\[\s*)?(?:chapter|topic|unit|section|part|no\.?)\s*(\d+(?:\.\d+)?)/i
  );
  if (prefixMatch && prefixMatch[1]) {
    const val = parseFloat(prefixMatch[1]);
    if (!Number.isNaN(val)) return val;
  }

  // 2. Bracketed number: "[1] ..."
  const bracketMatch = trimmed.match(/^\[\s*(\d+(?:\.\d+)?)\s*\]/);
  if (bracketMatch && bracketMatch[1]) {
    const val = parseFloat(bracketMatch[1]);
    if (!Number.isNaN(val)) return val;
  }

  // 3. Leading standard number: "1.", "1 -", "1)", "1:", "10 "
  const leadingMatch = trimmed.match(/^(\d+(?:\.\d+)?)/);
  if (leadingMatch && leadingMatch[1]) {
    const val = parseFloat(leadingMatch[1]);
    if (!Number.isNaN(val)) return val;
  }

  return null;
}

/**
 * Resolves the numeric sequence for a note.
 * Uses existing positive sequence/order field if available,
 * otherwise falls back to extracting the leading number from the title.
 */
export function getNoteSequenceNumber(note: SortableNote): number | null {
  if (!note) return null;

  // 1. Explicit sequence field if positive
  if (typeof note.sequence === "number" && !Number.isNaN(note.sequence) && note.sequence > 0) {
    return note.sequence;
  }

  // 2. Explicit order field if positive
  if (typeof note.order === "number" && !Number.isNaN(note.order) && note.order > 0) {
    return note.order;
  }

  // 3. Extract sequence number from title
  return extractLeadingNumber(note.title);
}

/**
 * Comparator function to sort notes in ascending numerical order.
 * - Numerically orders notes with sequence/title numbers (e.g., 1, 2, 3, 10).
 * - Sorts numerically, ensuring 2 comes before 10.
 * - Places numbered notes before unnumbered notes.
 * - Applies stable secondary sort (alphabetical by title, then ID) for unnumbered notes or ties.
 */
export function compareNotesAscending<T extends SortableNote>(a: T, b: T): number {
  const seqA = getNoteSequenceNumber(a);
  const seqB = getNoteSequenceNumber(b);

  if (seqA !== null && seqB !== null) {
    if (seqA !== seqB) {
      return seqA - seqB;
    }
  } else if (seqA !== null) {
    return -1; // a has sequence number, b does not -> a comes first
  } else if (seqB !== null) {
    return 1;  // b has sequence number, a does not -> b comes first
  }

  // Stable secondary sort: alphabetical by title
  const titleA = (a.title || "").trim();
  const titleB = (b.title || "").trim();
  const titleComparison = titleA.localeCompare(titleB, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (titleComparison !== 0) {
    return titleComparison;
  }

  // Stable tie-break by ID
  const idA = typeof a.id === "number" ? a.id : Number(a.id) || 0;
  const idB = typeof b.id === "number" ? b.id : Number(b.id) || 0;
  return idA - idB;
}

/**
 * Non-mutating sorting function that returns a new array of notes in ascending order.
 */
export function sortNotesAscending<T extends SortableNote>(notes: T[]): T[] {
  if (!Array.isArray(notes) || notes.length <= 1) {
    return notes ? [...notes] : [];
  }
  return [...notes].sort(compareNotesAscending);
}
