'use client';

import { useState } from 'react';
import { adminQuestionApi, ImportReport, ImportRow } from '@/lib/api/admin-questions';
import { AcademicDependentSelect } from '@/components/admin/syllabus/AcademicDependentSelect';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, AlertCircle, CheckCircle, FileText, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

const MISSING_LABELS: Record<string, string> = {
  options: 'Options A–D',
  correct_answer: 'Correct answer',
  explanation: 'Explanation',
};

export default function ImportQuestionsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  // Syllabus placement and defaults, chosen here rather than per CSV row.
  const [category, setCategory] = useState<number | undefined>();
  const [position, setPosition] = useState<number | undefined>();
  const [subject, setSubject] = useState<number | undefined>();
  const [chapter, setChapter] = useState<number | undefined>();
  const [topic, setTopic] = useState<number | undefined>();
  const [questionType, setQuestionType] = useState<'mcq' | 'true_false' | 'subjective'>('mcq');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  const handleAcademicChange = (field: string, value: any) => {
    if (field === 'category') {
      setCategory(value); setPosition(undefined); setSubject(undefined); setChapter(undefined); setTopic(undefined);
    } else if (field === 'position' || field === 'exam') {
      setPosition(value); setSubject(undefined); setChapter(undefined); setTopic(undefined);
    } else if (field === 'subject') {
      setSubject(value); setChapter(undefined); setTopic(undefined);
    } else if (field === 'chapter' || field === 'unit') {
      setChapter(value); setTopic(undefined);
    } else if (field === 'topic') {
      setTopic(value);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const downloadTemplate = async () => {
    try {
      await adminQuestionApi.downloadTemplate();
    } catch (error: any) {
      toast.error(error.message || 'Failed to download template');
    }
  };

  const handleUpload = async () => {
    if (!file || !topic) return;
    setBusy(true);
    try {
      const res = await adminQuestionApi.uploadCSV(file, {
        topic,
        question_type: questionType,
        difficulty,
      });
      setReport(res);
      setStep(2);
      toast.success(`Analyzed ${res.total_rows} rows`);
    } catch (error: any) {
      toast.error(error?.data?.error || error.message || 'Failed to analyze CSV');
    } finally {
      setBusy(false);
    }
  };

  const handleAiFill = async () => {
    if (!report) return;
    setBusy(true);
    try {
      const res = await adminQuestionApi.aiFillImport(report.import_id);
      setReport(res);
      toast.success('AI filled the missing fields');
    } catch (error: any) {
      toast.error(error?.data?.error || error.message || 'AI could not fill the missing fields');
    } finally {
      setBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!report) return;
    setBusy(true);
    try {
      const res = await adminQuestionApi.commitCSV(report.import_id);
      setImportedCount(res.imported_count);
      setStep(3);
      toast.success(`Imported ${res.imported_count} questions`);
    } catch (error: any) {
      toast.error(error?.data?.error || error.message || 'Failed to import');
    } finally {
      setBusy(false);
    }
  };

  const resetAll = () => {
    setStep(1); setFile(null); setReport(null); setImportedCount(0);
  };

  const rowTone = (status: ImportRow['status']) => {
    if (status === 'valid') return 'bg-green-50/50 border-green-100';
    if (status === 'incomplete') return 'bg-blue-50/50 border-blue-100';
    if (status === 'duplicate') return 'bg-amber-50/50 border-amber-100';
    return 'bg-red-50/50 border-red-100';
  };

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1200px] mx-auto">
      <div className="flex items-center gap-4">
        <Link
          href="/admin-dashboard/academic/questions"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Questions</h1>
          <p className="text-gray-500 mt-1">
            Choose where the questions belong, then upload a CSV of question content.
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[
          { n: 1, label: 'Setup & Upload' },
          { n: 2, label: 'Review & Fill' },
          { n: 3, label: 'Complete' },
        ].map((s, i) => (
          <div key={s.n} className={i === 0 ? 'flex items-center flex-1' : 'flex items-center flex-1 justify-end'}>
            {i > 0 && <div className={`flex-1 h-1 mx-4 rounded ${step >= s.n ? 'bg-[#0B2545]' : 'bg-gray-100'}`} />}
            <div className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step >= s.n ? 'bg-[#0B2545] text-white' : 'bg-gray-100 text-gray-400'
              }`}>{s.n}</div>
              <span className={`text-sm font-medium whitespace-nowrap ${step >= s.n ? 'text-[#0B2545]' : 'text-gray-400'}`}>
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: choose destination, then upload */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Where do these questions belong?</h2>
            <p className="text-sm text-gray-500 mb-6">
              These settings apply to every row in the file, so the CSV only needs the question content itself.
            </p>

            <AcademicDependentSelect
              category={category}
              position={position}
              subject={subject}
              chapter={chapter}
              topic={topic}
              onChange={handleAcademicChange}
              maxLevel="topic"
              layout="grid"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Question Type</label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="true_false">True / False</option>
                  <option value="subjective">Subjective</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
            <div className="max-w-xl mx-auto flex flex-col items-center">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-6">
                <UploadCloud className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Upload CSV File</h2>
              <p className="text-gray-500 text-center mb-2">
                The file needs a <code className="text-sm bg-gray-100 px-1 rounded">question</code> column.
                Options, answer and explanation are optional.
              </p>
              <p className="text-gray-500 text-center mb-8 text-sm">
                Leave any of them blank and the AI can fill them in on the next step.
              </p>

              <button
                onClick={downloadTemplate}
                className="text-[#0B2545] font-medium hover:underline flex items-center gap-2 mb-8"
              >
                <FileText className="w-4 h-4" /> Download CSV Template
              </button>

              <div className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors text-center relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {!file ? (
                  <div>
                    <p className="font-medium text-gray-700">Click to browse or drag and drop</p>
                    <p className="text-sm text-gray-500 mt-1">.csv format only</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <span className="font-medium text-gray-900">{file.name}</span>
                  </div>
                )}
              </div>

              {!topic && (
                <p className="text-sm text-amber-600 mt-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Select a topic above before analyzing.
                </p>
              )}

              <button
                disabled={!file || !topic || busy}
                onClick={handleUpload}
                className="w-full mt-6 bg-[#0B2545] hover:bg-[#163E6C] disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                {busy ? 'Analyzing...' : 'Analyze CSV'}
                {!busy && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: review, optionally let AI fill the gaps, then import */}
      {step === 2 && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 text-center">
              <p className="text-sm text-gray-500 font-medium">Total Rows</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{report.total_rows}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-green-100 text-center">
              <p className="text-sm text-green-600 font-medium">Ready</p>
              <p className="text-3xl font-bold text-green-700 mt-2">{report.valid_rows}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-blue-100 text-center">
              <p className="text-sm text-blue-600 font-medium">Needs Info</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">{report.incomplete_rows}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-amber-100 text-center">
              <p className="text-sm text-amber-600 font-medium">Duplicates</p>
              <p className="text-3xl font-bold text-amber-700 mt-2">{report.duplicate_rows}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-red-100 text-center">
              <p className="text-sm text-red-600 font-medium">Errors</p>
              <p className="text-3xl font-bold text-red-700 mt-2">{report.error_rows}</p>
            </div>
          </div>

          {report.incomplete_rows > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900">
                    {report.incomplete_rows} row{report.incomplete_rows === 1 ? '' : 's'} are missing information
                  </p>
                  <p className="text-sm text-blue-700 mt-0.5">
                    The AI can generate the missing options, answers and explanations for you.
                  </p>
                </div>
              </div>
              <button
                onClick={handleAiFill}
                disabled={busy}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                {busy ? 'Filling...' : 'Fill missing fields with AI'}
              </button>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Validation Report</h3>
              <p className="text-sm text-gray-500">Only rows marked ready will be imported.</p>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
              {report.report_data.map((row) => (
                <div key={row.row_index} className={`p-3 border rounded-lg flex items-start gap-3 ${rowTone(row.status)}`}>
                  <div className="mt-0.5">
                    {row.status === 'valid' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {row.status === 'incomplete' && <Sparkles className="w-5 h-5 text-blue-600" />}
                    {row.status === 'duplicate' && <AlertCircle className="w-5 h-5 text-amber-600" />}
                    {row.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      Row {row.row_index}: {row.data.question || '(no question text)'}
                    </p>

                    {row.missing?.length > 0 && (
                      <p className="mt-1 text-sm text-blue-700">
                        Missing: {row.missing.map((m) => MISSING_LABELS[m] || m).join(', ')}
                      </p>
                    )}

                    {row.ai_filled && row.ai_filled.length > 0 && row.missing.length === 0 && (
                      <p className="mt-1 text-sm text-green-700 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        AI filled: {row.ai_filled.map((m) => MISSING_LABELS[m] || m).join(', ')}
                      </p>
                    )}

                    {row.errors?.length > 0 && (
                      <ul className="mt-1 list-disc list-inside text-sm text-red-600">
                        {row.errors.map((err, j) => <li key={j}>{err}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={resetAll}
              className="px-6 py-3 font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel &amp; Start Over
            </button>
            <button
              disabled={report.valid_rows === 0 || busy}
              onClick={handleCommit}
              className="px-8 py-3 font-medium text-white bg-[#0B2545] hover:bg-[#163E6C] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2"
            >
              {busy ? 'Importing...' : `Import ${report.valid_rows} Question${report.valid_rows === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: done */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Successful</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            {importedCount} question{importedCount === 1 ? '' : 's'} were added to the Question Bank and
            assigned unique IDs.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/admin-dashboard/academic/questions"
              className="px-6 py-3 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Back to Question Bank
            </Link>
            <button
              onClick={resetAll}
              className="px-6 py-3 font-medium text-white bg-[#0B2545] hover:bg-[#163E6C] rounded-xl transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
