'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Edit, Trash2, Plus, X, Loader2, BookOpen,
  CheckSquare, Zap, RefreshCw, Search, AlertTriangle
} from 'lucide-react';
import { adminCollectionsApi, QuestionCollection, CollectionQuestion } from '@/lib/api/admin-collections';
import { adminQuestionApi } from '@/lib/api/admin-questions';
import { toast } from 'react-hot-toast';

// ---- Mini Add Questions Modal ----
interface AddQuestionsModalProps {
  collectionId: number;
  onDone: () => void;
  onClose: () => void;
}

function AddQuestionsModal({ collectionId, onDone, onClose }: AddQuestionsModalProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminQuestionApi
      .getQuestions({ page_size: 200 })
      .then(d => setQuestions(Array.isArray(d) ? d : (d.results || [])))
      .catch(() => toast.error('Failed to load questions'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = questions.filter(q =>
    !search || q.text?.toLowerCase().includes(search.toLowerCase()) || q.question_id?.includes(search)
  );

  const toggle = (id: number) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await adminCollectionsApi.addQuestions(collectionId, Array.from(selected));
      toast.success(`${selected.size} question(s) added to collection!`);
      onDone();
    } catch {
      toast.error('Failed to add questions. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Questions to Collection</h2>
            <p className="text-sm text-gray-500">{selected.size} selected</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0B2545]"
            />
          </div>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto divide-y">
          {loading ? (
            <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No questions found.</div>
          ) : (
            filtered.map((q: any) => (
              <label key={q.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(q.id)}
                  onChange={() => toggle(q.id)}
                  className="mt-0.5 w-4 h-4 rounded text-[#0B2545]"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2">{q.text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{q.question_id} · {q.question_type} · {q.difficulty}</p>
                </div>
              </label>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-between items-center bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={selected.size === 0 || saving}
            className="px-5 py-2 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {saving ? 'Adding...' : `Add ${selected.size > 0 ? selected.size : ''} Questions`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Delete Confirm Dialog ----
interface DeleteDialogProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}

function DeleteDialog({ name, onConfirm, onCancel, deleting }: DeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Collection</h2>
        <p className="text-sm text-gray-500 text-center mb-6">
          Are you sure you want to delete <strong>"{name}"</strong>? This action cannot be undone.
          Questions in this collection will not be deleted.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Detail Page ----
export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const collectionId = Number(params?.id);

  const [collection, setCollection] = useState<QuestionCollection | null>(null);
  const [questions, setQuestions] = useState<CollectionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQIds, setSelectedQIds] = useState<Set<number>>(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removingSelected, setRemovingSelected] = useState(false);

  const load = useCallback(async () => {
    if (!collectionId) return;
    setLoading(true);
    try {
      const [col, qs] = await Promise.all([
        adminCollectionsApi.getCollection(collectionId),
        adminCollectionsApi.getCollectionQuestions(collectionId),
      ]);
      setCollection(col);
      setQuestions(qs);
    } catch {
      toast.error('Failed to load collection.');
    } finally {
      setLoading(false);
    }
  }, [collectionId]);

  useEffect(() => { load(); }, [load]);

  // If redirected from Create with addQuestions=1, auto-open modal
  useEffect(() => {
    if (searchParams?.get('addQuestions') === '1' && !loading) {
      setShowAddModal(true);
    }
  }, [searchParams, loading]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminCollectionsApi.deleteCollection(collectionId);
      toast.success('Collection deleted.');
      router.push('/admin-dashboard/academic/collections');
    } catch {
      toast.error('Failed to delete collection. Please try again.');
      setDeleting(false);
    }
  };

  const handleRemoveSelected = async () => {
    if (selectedQIds.size === 0) return;
    const confirmed = window.confirm(`Remove ${selectedQIds.size} question(s) from this collection?`);
    if (!confirmed) return;
    setRemovingSelected(true);
    try {
      await adminCollectionsApi.removeQuestions(collectionId, Array.from(selectedQIds));
      toast.success(`${selectedQIds.size} question(s) removed.`);
      setSelectedQIds(new Set());
      await load();
    } catch {
      toast.error('Failed to remove questions.');
    } finally {
      setRemovingSelected(false);
    }
  };

  const handleScanRules = async () => {
    try {
      const result = await adminCollectionsApi.scanRules(collectionId);
      toast.success(`Scan complete. Matched ${result.matched} questions, created ${result.suggestions_created} suggestions.`);
    } catch {
      toast.error('Scan failed.');
    }
  };

  const toggleSelectQ = (id: number) => {
    const next = new Set(selectedQIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedQIds(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!collection) {
    return <div className="p-6 text-center text-gray-500">Collection not found.</div>;
  }

  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    hard: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Modals */}
      {showAddModal && (
        <AddQuestionsModal
          collectionId={collectionId}
          onDone={() => { setShowAddModal(false); load(); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showDeleteDialog && (
        <DeleteDialog
          name={collection.name}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          deleting={deleting}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin-dashboard/academic/collections" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: collection.color || '#0B2545' }}
            >
              {collection.name[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{collection.name}</h1>
              <p className="text-sm text-gray-500">{collection.question_count} questions · {collection.status}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin-dashboard/academic/collections/${collectionId}/edit`}
            className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Edit className="w-4 h-4" /> Edit Collection
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Questions
          </button>
          {selectedQIds.size > 0 && (
            <button
              onClick={handleRemoveSelected}
              disabled={removingSelected}
              className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center gap-1.5 disabled:opacity-60"
            >
              {removingSelected ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Remove {selectedQIds.size} Selected
            </button>
          )}
          <button
            onClick={handleScanRules}
            className="px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4" /> Auto Rules
          </button>
          <button
            onClick={load}
            className="p-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            className="px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Description */}
      {collection.description && (
        <p className="text-gray-600 text-sm bg-white border border-gray-100 rounded-xl p-4">
          {collection.description}
        </p>
      )}

      {/* Questions Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Questions ({questions.length})
          </h2>
          {selectedQIds.size > 0 && (
            <span className="text-sm text-gray-500">{selectedQIds.size} selected</span>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No questions in this collection yet.</p>
            <p className="text-gray-400 text-sm mt-1">Click "Add Questions" to get started.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-5 py-2 bg-[#0B2545] text-white rounded-lg text-sm font-medium hover:bg-[#163E6C] transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Questions
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="pl-4 py-3 w-10">
                    <input
                      type="checkbox"
                      onChange={e => {
                        if (e.target.checked) setSelectedQIds(new Set(questions.map(q => q.id)));
                        else setSelectedQIds(new Set());
                      }}
                      checked={selectedQIds.size === questions.length && questions.length > 0}
                      className="w-4 h-4 rounded"
                    />
                  </th>
                  <th className="py-3 px-3 text-left">Question</th>
                  <th className="py-3 px-3 text-left">Type</th>
                  <th className="py-3 px-3 text-left">Difficulty</th>
                  <th className="py-3 px-3 text-left">Subject</th>
                  <th className="py-3 px-3 text-left">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {questions.map(q => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="pl-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedQIds.has(q.id)}
                        onChange={() => toggleSelectQ(q.id)}
                        className="w-4 h-4 rounded"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <p className="line-clamp-2 text-gray-800">{q.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{q.question_id}</p>
                    </td>
                    <td className="py-3 px-3 capitalize text-gray-600">{q.question_type?.replace('_', ' ')}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${difficultyColors[q.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600">{q.subject_name || '—'}</td>
                    <td className="py-3 px-3 capitalize text-gray-600">{q.status}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={async () => {
                          const confirmed = window.confirm('Remove this question from the collection?');
                          if (!confirmed) return;
                          try {
                            await adminCollectionsApi.removeQuestions(collectionId, [q.id]);
                            toast.success('Question removed.');
                            load();
                          } catch {
                            toast.error('Failed to remove question.');
                          }
                        }}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="Remove from collection"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
