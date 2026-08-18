'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminQuestionApi } from '@/lib/api/admin-questions';
import Link from 'next/link';
import { ArrowLeft, UploadCloud, AlertCircle, CheckCircle, FileText, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ImportQuestionsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [report, setReport] = useState<any>(null);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await adminQuestionApi.uploadCSV(file);
      setReport(res);
      setStep(2);
      toast.success('File analyzed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleCommit = async () => {
    if (!report?.import_id) return;
    setUploading(true);
    try {
      const res = await adminQuestionApi.commitCSV(report.import_id);
      toast.success(`Successfully imported ${res.imported_count} questions`);
      setStep(3);
    } catch (error: any) {
      toast.error(error.message || 'Failed to commit import');
    } finally {
      setUploading(false);
    }
  };
  
  const downloadTemplate = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'}/admin/questions/import/template/`);
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
          <p className="text-gray-500 mt-1">Upload questions in bulk using a CSV file.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="flex flex-col items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-navy-600 text-white' : 'bg-gray-100 text-gray-400'}`}>1</div>
          <span className={`text-sm font-medium ${step >= 1 ? 'text-navy-900' : 'text-gray-400'}`}>Upload</span>
        </div>
        <div className={`flex-1 h-1 mx-4 rounded ${step >= 2 ? 'bg-navy-600' : 'bg-gray-100'}`} />
        <div className="flex flex-col items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-navy-600 text-white' : 'bg-gray-100 text-gray-400'}`}>2</div>
          <span className={`text-sm font-medium ${step >= 2 ? 'text-navy-900' : 'text-gray-400'}`}>Validate</span>
        </div>
        <div className={`flex-1 h-1 mx-4 rounded ${step >= 3 ? 'bg-navy-600' : 'bg-gray-100'}`} />
        <div className="flex flex-col items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-navy-600 text-white' : 'bg-gray-100 text-gray-400'}`}>3</div>
          <span className={`text-sm font-medium ${step >= 3 ? 'text-navy-900' : 'text-gray-400'}`}>Complete</span>
        </div>
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <div className="max-w-xl mx-auto flex flex-col items-center">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <UploadCloud className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Upload CSV File</h2>
            <p className="text-gray-500 text-center mb-8">
              Download the template to see the required format. The file should be less than 5MB.
            </p>
            
            <button 
              onClick={downloadTemplate}
              className="text-navy-600 font-medium hover:underline flex items-center gap-2 mb-8"
            >
              <FileText className="w-4 h-4" /> Download CSV Template
            </button>

            <div className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 hover:bg-gray-50 transition-colors text-center relative group">
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

            <button
              disabled={!file || uploading}
              onClick={handleUpload}
              className="w-full mt-6 bg-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              {uploading ? 'Analyzing...' : 'Analyze CSV'} 
              {!uploading && <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Validate */}
      {step === 2 && report && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100 text-center">
              <p className="text-sm text-gray-500 font-medium">Total Rows</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{report.total_rows}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-green-100 text-center">
              <p className="text-sm text-green-600 font-medium">Valid</p>
              <p className="text-3xl font-bold text-green-700 mt-2">{report.valid_rows}</p>
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

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Validation Report</h3>
              <p className="text-sm text-gray-500">Only valid rows will be imported.</p>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-4 space-y-3">
              {report.report_data.map((row: any, i: number) => (
                <div key={i} className={`p-3 border rounded-lg flex items-start gap-3 ${
                  row.status === 'valid' ? 'bg-green-50/50 border-green-100' :
                  row.status === 'duplicate' ? 'bg-amber-50/50 border-amber-100' :
                  'bg-red-50/50 border-red-100'
                }`}>
                  <div className="mt-0.5">
                    {row.status === 'valid' && <CheckCircle className="w-5 h-5 text-green-600" />}
                    {row.status === 'duplicate' && <AlertCircle className="w-5 h-5 text-amber-600" />}
                    {row.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Row {row.row_index}: {row.data.question?.substring(0, 50)}...</p>
                    {row.errors && row.errors.length > 0 && (
                      <ul className="mt-1 list-disc list-inside text-sm text-red-600">
                        {row.errors.map((err: string, j: number) => <li key={j}>{err}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setStep(1); setFile(null); }}
              className="px-6 py-3 font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel & Start Over
            </button>
            <button
              disabled={report.valid_rows === 0 || uploading}
              onClick={handleCommit}
              className="px-8 py-3 font-medium text-white bg-navy-600 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2"
            >
              {uploading ? 'Importing...' : `Import ${report.valid_rows} Valid Questions`}
            </button>
          </div>
        </div>
      )}
      
      {/* Step 3: Complete */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Import Successful!</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            The questions have been successfully imported into the Master Question Bank and assigned unique IDs.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/admin-dashboard/academic/questions"
              className="px-6 py-3 font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Back to Question Bank
            </Link>
            <button
              onClick={() => { setStep(1); setFile(null); setReport(null); }}
              className="px-6 py-3 font-medium text-white bg-navy-600 hover:bg-navy-700 rounded-xl transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
