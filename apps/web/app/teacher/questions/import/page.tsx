"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, ChevronLeft, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
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
      
      const values = lines[i].split(',').map(v => v.trim());
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
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/teacher/questions")}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Import</h1>
          <p className="text-muted-foreground">Upload questions via CSV</p>
        </div>
      </div>

      {!fileContent ? (
        <Card className="border-dashed border-2 bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              <FileSpreadsheet className="w-10 h-10 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold">Upload CSV File</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                File must include headers: text, question_type, topic_id, difficulty, marks, option_a, option_b, option_c, option_d, correct_option
              </p>
            </div>
            <div className="pt-4 relative">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button>Select File</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
           
           <div className="grid grid-cols-2 gap-4">
             <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20">
               <CardContent className="p-4 flex items-center gap-4">
                 <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                   <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Valid Rows</p>
                   <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{parsedRows.length}</p>
                 </div>
               </CardContent>
             </Card>
             <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
               <CardContent className="p-4 flex items-center gap-4">
                 <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                   <AlertCircle className="w-6 h-6 text-red-600" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-red-800 dark:text-red-300">Errors</p>
                   <p className="text-2xl font-bold text-red-700 dark:text-red-400">{errors.length}</p>
                 </div>
               </CardContent>
             </Card>
           </div>

           {errors.length > 0 && (
             <Card className="border-red-200">
               <CardHeader className="bg-red-50 dark:bg-red-950/30 pb-3">
                 <CardTitle className="text-red-800 dark:text-red-300 text-lg">Fix these errors</CardTitle>
               </CardHeader>
               <CardContent className="p-4">
                 <ul className="space-y-2 text-sm text-red-700 dark:text-red-400">
                   {errors.map((e, idx) => (
                     <li key={idx}>Row {e.row}: {e.error}</li>
                   ))}
                 </ul>
               </CardContent>
             </Card>
           )}

           <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => { setFileContent(null); setParsedRows([]); setErrors([]); }}>
                Cancel / Re-upload
             </Button>
             <Button 
               onClick={handleImport} 
               disabled={parsedRows.length === 0 || isImporting}
               className="bg-primary"
             >
               {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
               Import {parsedRows.length} Questions as Drafts
             </Button>
           </div>
        </div>
      )}
    </div>
  );
}
