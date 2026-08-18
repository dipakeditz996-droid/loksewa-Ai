'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminQuestionSetApi, QuestionSet } from '@/lib/api/admin-question-sets';
import { 
  Plus, Search, RefreshCw, MoreVertical, Edit, Copy, 
  Trash2, Globe, Lock, Clock, Layers, Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function QuestionSetsPage() {
  const router = useRouter();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  
  const fetchSets = async () => {
    setLoading(true);
    try {
      const res = await adminQuestionSetApi.getQuestionSets();
      setSets(res.results || []);
    } catch (error: any) {
      toast.error('Failed to fetch question sets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSets();
  }, []);

  const handleDuplicate = async (id: number) => {
    if (!confirm('Duplicate this question set?')) return;
    try {
      await adminQuestionSetApi.duplicateQuestionSet(id);
      toast.success('Set duplicated successfully');
      fetchSets();
    } catch (e: any) {
      toast.error(e.message || 'Failed to duplicate set');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this question set? Questions in the Master Question Bank will not be affected.')) return;
    try {
      await adminQuestionSetApi.deleteQuestionSet(id);
      toast.success('Question set deleted');
      fetchSets();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete set');
    }
  };
  
  const handleTogglePublish = async (set: QuestionSet) => {
    try {
      if (set.status === 'published') {
        await adminQuestionSetApi.unpublishQuestionSet(set.id);
        toast.success('Set unpublished (now Draft)');
      } else {
        await adminQuestionSetApi.publishQuestionSet(set.id);
        toast.success('Set published successfully');
      }
      fetchSets();
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status. Check if you have enough questions selected.');
    }
  };

  const filteredSets = sets.filter(set => {
    if (activeTab !== 'all' && set.status !== activeTab) return false;
    if (search && !set.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Sets</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Create, manage and organize exam-ready question sets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchSets}
            className="p-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            href="/admin-dashboard/academic/question-sets/create"
            className="flex items-center gap-2 px-4 py-2 bg-[#0B2545] text-white rounded-lg text-sm font-medium hover:bg-[#163E6C] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Question Set
          </Link>
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex space-x-1 bg-gray-100/50 p-1 rounded-lg">
            {['all', 'draft', 'published', 'archived'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search sets..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0B2545]"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="p-4 font-medium">Set Name</th>
                <th className="p-4 font-medium">Position</th>
                <th className="p-4 font-medium">Questions</th>
                <th className="p-4 font-medium">Time Limit</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0B2545]" />
                    Loading question sets...
                  </td>
                </tr>
              ) : filteredSets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium text-gray-900">No Question Sets Yet</p>
                    <p className="mt-1">Create your first exam-ready question set from the Master Question Bank.</p>
                    <Link
                      href="/admin-dashboard/academic/question-sets/create"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-[#0B2545] text-white rounded-lg text-sm font-medium hover:bg-[#163E6C] transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Create Question Set
                    </Link>
                  </td>
                </tr>
              ) : (
                filteredSets.map(set => (
                  <tr key={set.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {set.name}
                        <span className="text-[10px] font-semibold tracking-wider uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {set.set_type?.replace('_', ' ') || 'CUSTOM'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {set.set_type === 'full_mock' ? 'Multiple Subjects' : (set.subject_name || 'No Subject')}
                        {set.unit_name && ` › ${set.unit_name}`}
                        {set.topic_name && ` › ${set.topic_name}`}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {set.position_name || '-'}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {set.questions_list?.length || 0} / {set.total_questions}
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {set.time_limit} mins
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        set.status === 'published' ? 'bg-green-50 text-green-700' :
                        set.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>
                        {set.status === 'published' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        {set.status.charAt(0).toUpperCase() + set.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/admin-dashboard/academic/question-sets/${set.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(set.id)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 rounded hover:bg-amber-50 transition-colors"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTogglePublish(set)}
                          className="p-1.5 text-gray-400 hover:text-green-600 rounded hover:bg-green-50 transition-colors"
                          title={set.status === 'published' ? 'Unpublish' : 'Publish'}
                        >
                          {set.status === 'published' ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(set.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
