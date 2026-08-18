'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Edit3, List, FileUp } from 'lucide-react';
import { SingleQuestionForm } from '@/components/admin/questions/SingleQuestionForm';
import { BulkQuestionEntry } from '@/components/admin/questions/BulkQuestionEntry';

export default function CreateQuestionPage() {
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin-dashboard/academic/questions" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Question</h1>
          <p className="text-gray-500 mt-1">Add new questions to the unified bank.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('single')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'single'
              ? 'border-navy-600 text-navy-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <Edit3 className="w-4 h-4" />
          Single Question
        </button>
        <button
          onClick={() => setActiveTab('bulk')}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'bulk'
              ? 'border-navy-600 text-navy-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <List className="w-4 h-4" />
          Bulk Question Entry
        </button>
        <Link
          href="/admin-dashboard/academic/questions/import"
          className="flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
        >
          <FileUp className="w-4 h-4" />
          CSV Import
        </Link>
      </div>

      <div className="mt-6">
        {activeTab === 'single' && (
          <div className="max-w-4xl">
            <SingleQuestionForm />
          </div>
        )}
        {activeTab === 'bulk' && <BulkQuestionEntry />}
      </div>
    </div>
  );
}
