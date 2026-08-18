"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Loader2, Edit, Trash2, Folder, ChevronRight,
  AlertTriangle, RefreshCw, BookOpen
} from 'lucide-react';
import { adminCollectionsApi, QuestionCollection } from '@/lib/api/admin-collections';
import { toast } from "react-hot-toast";

export default function CollectionsPage() {
  const router = useRouter();
  const [collections, setCollections] = useState<QuestionCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<QuestionCollection | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const data = await adminCollectionsApi.getCollections();
      setCollections(data);
    } catch {
      toast.error("Failed to fetch collections");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  const handleDelete = async (collection: QuestionCollection) => {
    setDeletingId(collection.id);
    try {
      await adminCollectionsApi.deleteCollection(collection.id);
      toast.success(`"${collection.name}" deleted.`);
      setCollections(prev => prev.filter(c => c.id !== collection.id));
    } catch {
      toast.error('Failed to delete collection. Please try again.');
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const filtered = collections.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
  );

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-5 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Delete Confirmation Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Collection</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Are you sure you want to delete <strong>"{confirmDelete.name}"</strong>?
              This cannot be undone. Questions will NOT be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deletingId !== null}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deletingId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Question Collections</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Organize questions into dynamic collections for exams and practice sets.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchCollections}
            className="p-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/admin-dashboard/academic/collections/create"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg text-sm font-medium transition-colors shadow-md"
          >
            <Plus className="h-4 w-4" />
            Create Collection
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search collections..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0B2545]"
            />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-500">Loading collections...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Folder className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">
                {search ? 'No collections match your search.' : 'No collections yet.'}
              </p>
              {!search && (
                <p className="text-gray-400 text-sm mt-1 mb-4">Create your first collection to get started.</p>
              )}
              {!search && (
                <Link
                  href="/admin-dashboard/academic/collections/create"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-[#0B2545] text-white rounded-lg text-sm font-medium hover:bg-[#163E6C] transition-colors"
                >
                  <Plus className="h-4 w-4" /> Create Collection
                </Link>
              )}
            </div>
          ) : (
            filtered.map(collection => (
              <div
                key={collection.id}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <Link
                  href={`/admin-dashboard/academic/collections/${collection.id}`}
                  className="flex items-center gap-4 flex-1 min-w-0"
                >
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: collection.color || '#0B2545' }}
                  >
                    {collection.name[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 group-hover:text-[#0B2545] transition-colors">{collection.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[collection.status] || 'bg-gray-100 text-gray-600'}`}>
                        {collection.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      <BookOpen className="w-3.5 h-3.5 inline mr-1" />
                      {collection.question_count ?? 0} questions
                      {collection.description ? ` · ${collection.description.slice(0, 60)}${collection.description.length > 60 ? '...' : ''}` : ''}
                    </p>
                  </div>
                </Link>

                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Link
                    href={`/admin-dashboard/academic/collections/${collection.id}/edit`}
                    className="p-2 text-gray-500 hover:text-[#0B2545] hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => setConfirmDelete(collection)}
                    disabled={deletingId === collection.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === collection.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                  <Link
                    href={`/admin-dashboard/academic/collections/${collection.id}`}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
