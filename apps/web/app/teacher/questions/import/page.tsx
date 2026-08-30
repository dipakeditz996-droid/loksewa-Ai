"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, ChevronLeft, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bulkImportQuestions, QuestionData } from "@/lib/api/teacher-questions";
import toast from "react-hot-toast";

export default function BulkImportPage() {
  const router = useRouter();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<Partial<QuestionData>[]>([]);
  const [errors, setErrors] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // We are parsing CSV in the browser for simplicity and better UX preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      setFileContent(csv);
      parseCSV(csv);
    };
    reader.readAsText(file);
  };

  const parseCSV = (csv: string) => {
    const lines = csv.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length < 2) {
      toast.error("CSV appears to be empty or missing headers");
      return;
    }

    const headers = lines[0]!.split(',').map(h => h.trim().toLowerCase());
    const expectedHeaders = ['text', 'question_type', 'topic_id', 'difficulty', 'marks', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_option'];

    // Check if basic headers exist
    const missing = expectedHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
      toast.error(`Missing required headers: ${missing.join(', ')}`);
      return;
    }

    const rows: Partial<QuestionData>[] = [];
    const parseErrors: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Basic CSV parsing (doesn't handle commas inside quotes properly without a library like papaparse)
      // For this implementation plan we will do a simple split, assuming simple CSV format.
      // A production app would use papaparse.

      const values = lines[i]!.split(',').map(v => v.trim());
      const row: any = {};
      let hasError = false;

      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      if (!row.text) {
        parseErrors.push({ row: i, error: "Question text is required" });
        hasError = true;
      }
      if (!row.topic_id || isNaN(parseInt(row.topic_id))) {
        parseErrors.push({ row: i, error: "Valid topic_id is required" });
        hasError = true;
      }

      if (!hasError) {
        rows.push({
          text: row.text,
          question_type: row.question_type || 'mcq',
          topic: parseInt(row.topic_id),
          difficulty: row.difficulty || 'medium',
          marks: parseFloat(row.marks) || 1,
          option_a: row.option_a || '',
          option_b: row.option_b || '',
          option_c: row.option_c || '',
          option_d: row.option_d || '',
          correct_option: row.correct_option || 'A',
        });
      }
    }

    setParsedRows(rows);
    setErrors(parseErrors);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    try {
      setIsImporting(true);

      // The API endpoint expects topic_id mapped from the topic key for creation
      const payload = parsedRows.map(row => ({
        ...row,
        topic_id: row.topic
      }));

      await bulkImportQuestions(payload as any);
      toast.success(`Successfully imported ${parsedRows.length} questions`);
      router.push("/teacher/questions");
    } catch (error: any) {
      toast.error(error?.data?.detail || "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 md:p-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/teacher/questions")}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-heading text-[22px] font-extrabold tracking-tight text-primary">Bulk Import</h1>
          <p className="text-[13px] text-muted-foreground">Upload questions via CSV</p>
        </div>
      </div>

      {!fileContent ? (
        <div className="rounded-2xl border-2 border-dashed border-border bg-card">
          <div className="flex flex-col items-center justify-center gap-4 p-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <FileSpreadsheet className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-foreground">Upload CSV File</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                File must include headers: text, question_type, topic_id, difficulty, marks, option_a, option_b, option_c, option_d, correct_option
              </p>
            </div>
            <div className="relative pt-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <Button className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white">Select File</Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4 rounded-2xl border border-[#0F7A69]/20 bg-[#0F7A69]/10 p-4">
              <div className="rounded-full bg-card p-3">
                <CheckCircle2 className="h-6 w-6 text-[#0F7A69] dark:text-[#4ADE9C]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0F7A69] dark:text-[#4ADE9C]">Valid Rows</p>
                <p className="text-2xl font-bold text-[#0F7A69] dark:text-[#4ADE9C]">{parsedRows.length}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-2xl border border-[#B23A3A]/20 bg-destructive/10 p-4">
              <div className="rounded-full bg-card p-3">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">Errors</p>
                <p className="text-2xl font-bold text-destructive">{errors.length}</p>
              </div>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-[#B23A3A]/20">
              <div className="bg-destructive/10 px-5 py-3">
                <h3 className="text-lg font-bold text-destructive">Fix these errors</h3>
              </div>
              <div className="bg-card p-4">
                <ul className="space-y-2 text-sm text-destructive">
                  {errors.map((e, idx) => (
                    <li key={idx}>Row {e.row}: {e.error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" className="rounded-[9px] border-border" onClick={() => { setFileContent(null); setParsedRows([]); setErrors([]); }}>
              Cancel / Re-upload
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedRows.length === 0 || isImporting}
              className="rounded-[9px] bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import {parsedRows.length} Questions as Drafts
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
