'use client';

import { useState, useEffect } from 'react';
import { adminQuestionApi, AdminQuestion, QuestionStats } from '@/lib/api/admin-questions';
import { adminCollectionsApi, QuestionCollection } from '@/lib/api/admin-collections';
import Link from 'next/link';
import { 
  FileText, CheckSquare, Plus, Search, Filter, Upload,
  MoreVertical, Edit2, Trash2, Copy, BookOpen, Layers,
  Wand2, FolderPlus
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Modals
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  
  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedAiStatus, setSelectedAiStatus] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchCollections();
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [page, selectedType, selectedStatus, selectedDifficulty, selectedAiStatus]);

  const fetchStats = async () => {
    try {
      const data = await adminQuestionApi.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  };

  const fetchCollections = async () => {
    try {
      const data = await adminCollectionsApi.getCollections();
      setCollections(data);
    } catch (error) {
      console.error('Failed to load collections', error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const data = await adminQuestionApi.getQuestions({
        search: search || undefined,
        question_type: selectedType || undefined,
        status: selectedStatus || undefined,
        difficulty: selectedDifficulty || undefined,
        ai_status: selectedAiStatus || undefined,
      });
      const results = Array.isArray(data) ? data : (data.results || []);
      setQuestions(results);
      setHasMore(!Array.isArray(data) && !!data.next);
      setSelectedIds(new Set()); // clear selection on reload
    } catch (error) {
      toast.error('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchQuestions();
  };

  const handleDuplicate = async (id: number) => {
    try {
      await adminQuestionApi.duplicateQuestion(id);
      toast.success('Question duplicated as draft');
      fetchStats();
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to duplicate question');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await adminQuestionApi.deleteQuestion(id);
      toast.success('Question deleted');
      fetchStats();
      fetchQuestions();
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };
  
  const handleBulkAction = async (action: 'publish' | 'draft' | 'archive' | 'delete' | 'add_to_collection' | 'remove_from_collection', collectionIds?: number[]) => {
    if (selectedIds.size === 0) return;
    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedIds.size} questions?`)) return;
    
    try {
      const res = await adminQuestionApi.bulkAction(action, Array.from(selectedIds), collectionIds);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Successfully applied action to ${res.count} questions`);
        fetchStats();
        fetchQuestions();
        setIsCollectionModalOpen(false);
      }
    } catch (error) {
      toast.error(`Failed to perform bulk action`);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === questions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(questions.map(q => q.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-gray-500 mt-1">Manage unified questions across the entire platform.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/admin-dashboard/academic/questions/import"
            className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm whitespace-nowrap"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Link>
          <Link
            href="/admin-dashboard/academic/questions/create"
            className="bg-[#0B2545] hover:bg-[#163E6C] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm shadow-md whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Questions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <div className="p-3 bg-navy-50 rounded-lg">
              <Layers className="w-6 h-6 text-navy-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">MCQ Questions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.mcq}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Subjective Questions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.subjective}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active Questions</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.active}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between bg-amber-50/30">
            <div>
              <p className="text-sm font-medium text-amber-700">AI Pending</p>
              <p className="text-3xl font-bold text-amber-900 mt-1">{stats.ai_pending || 0}</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <Wand2 className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearch} className="relative w-full md:w-96">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search questions, options, or answers..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-navy-500"
          />
        </form>
        
        <div className="flex gap-2 w-full md:w-auto items-center flex-wrap">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 mr-2 bg-navy-50 px-3 py-1.5 rounded-lg border border-navy-100">
              <span className="text-sm font-medium text-navy-800">{selectedIds.size} selected</span>
              <div className="h-4 w-px bg-navy-200 mx-1"></div>
              <button onClick={() => setIsCollectionModalOpen(true)} className="text-xs font-medium text-indigo-700 hover:text-indigo-800 flex items-center gap-1"><FolderPlus className="w-3 h-3"/> Add to Collection</button>
              <button onClick={() => handleBulkAction('publish')} className="text-xs font-medium text-green-700 hover:text-green-800 ml-1">Publish</button>
              <button onClick={() => handleBulkAction('draft')} className="text-xs font-medium text-gray-600 hover:text-gray-800 ml-1">Draft</button>
              <button onClick={() => handleBulkAction('delete')} className="text-xs font-medium text-red-600 hover:text-red-800 ml-1">Delete</button>
            </div>
          )}
          <select 
            value={selectedAiStatus} 
            onChange={(e) => setSelectedAiStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy-500"
          >
            <option value="">All AI Status</option>
            <option value="pending">Pending AI Generation</option>
            <option value="reviewed">AI Reviewed</option>
            <option value="approved">AI Approved</option>
          </select>
          <select 
            value={selectedType} 
            onChange={(e) => setSelectedType(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy-500"
          >
            <option value="">All Types</option>
            <option value="mcq">MCQ</option>
            <option value="subjective">Subjective</option>
            <option value="true_false">True / False</option>
          </select>
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-navy-500"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </div>

      <Dialog open={isCollectionModalOpen} onOpenChange={setIsCollectionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {selectedIds.size} Question{selectedIds.size !== 1 ? 's' : ''} to Collection</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
            {collections.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No collections yet. <Link href="/admin-dashboard/academic/collections/create" className="text-[#0B2545] underline">Create one first.</Link>
              </p>
            ) : (
              collections.map(c => (
                <label key={c.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="collection"
                    value={c.id}
                    checked={selectedCollectionId === String(c.id)}
                    onChange={() => setSelectedCollectionId(String(c.id))}
                    className="w-4 h-4 text-[#0B2545]"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c.color || '#0B2545' }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.question_count ?? 0} questions</p>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCollectionModalOpen(false); setSelectedCollectionId(''); }}>Cancel</Button>
            <Button
              onClick={() => handleBulkAction('add_to_collection', selectedCollectionId ? [parseInt(selectedCollectionId)] : [])}
              disabled={!selectedCollectionId}
              className="bg-[#0B2545] hover:bg-[#163E6C] text-white"
            >
              Add Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Data Table */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500">
                <th className="p-4 w-12">
                  <input 
                    type="checkbox" 
                    checked={questions.length > 0 && selectedIds.size === questions.length}
                    onChange={toggleSelectAll}
                    className="rounded text-navy-600 focus:ring-navy-500 w-4 h-4"
                  />
                </th>
                <th className="p-4 font-medium">Question</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium">Syllabus Context</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <div className="flex justify-center mb-2">
                      <div className="w-6 h-6 border-2 border-navy-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    Loading questions...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No questions found matching your criteria.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr key={q.id} className={`hover:bg-gray-50 transition-colors group ${selectedIds.has(q.id) ? 'bg-blue-50/50' : ''}`}>
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.has(q.id)}
                        onChange={() => toggleSelect(q.id)}
                        className="rounded text-navy-600 focus:ring-navy-500 w-4 h-4"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">
                          {q.question_id || `Q-${q.id.toString().padStart(6, '0')}`}
                        </span>
                        <div>
                          <div className="line-clamp-2 text-sm font-medium text-gray-900 max-w-md">
                            {q.text}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                            <span>{q.marks} Marks • {q.expected_time_minutes} min</span>
                            {q.usage_count > 0 && (
                              <span className="text-blue-600 bg-blue-50 px-1.5 rounded-full flex items-center gap-1">
                                <Layers className="w-3 h-3" /> Used in {q.usage_count} sets
                              </span>
                            )}
                            {q.collections && q.collections.length > 0 && (
                              <span className="text-indigo-600 bg-indigo-50 px-1.5 rounded-full flex items-center gap-1">
                                <FolderPlus className="w-3 h-3" /> {q.collections.length} Collections
                              </span>
                            )}
                            {q.ai_status === 'pending' && (
                              <span className="text-amber-600 bg-amber-50 px-1.5 rounded-full flex items-center gap-1">
                                <Wand2 className="w-3 h-3" /> AI Pending
                              </span>
                            )}
                            {q.ai_status === 'approved' && (
                              <span className="text-emerald-600 bg-emerald-50 px-1.5 rounded-full flex items-center gap-1">
                                <Wand2 className="w-3 h-3" /> AI Generated
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                        q.question_type === 'mcq' ? 'bg-blue-50 text-blue-700' : 
                        'bg-purple-50 text-purple-700'
                      }`}>
                        {q.question_type.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-medium text-navy-700">{q.position_name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{q.subject_name} • {q.topic_name}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        q.status === 'published' ? 'bg-green-100 text-green-700' : 
                        q.status === 'draft' ? 'bg-gray-100 text-gray-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {q.ai_status === 'pending' && (
                          <Link 
                            href={`/admin-dashboard/academic/questions/${q.id}/edit`}
                            className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded"
                            title="Generate AI Options"
                          >
                            <Wand2 className="w-4 h-4" />
                          </Link>
                        )}
                        <button 
                          onClick={() => handleDuplicate(q.id)}
                          className="p-1.5 text-gray-400 hover:text-navy-600 hover:bg-navy-50 rounded"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <Link 
                          href={`/admin-dashboard/academic/questions/${q.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(q.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
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

