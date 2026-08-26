'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, BookOpen, FileText, Bookmark, Clock, Lock } from 'lucide-react';
import { notesApi, StudyMaterial } from '@/lib/api/notes';

function NotesContent() {
  const searchParams = useSearchParams();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  
  const urlTopic = searchParams.get('topic');
  const urlSubject = searchParams.get('subject');
  
  useEffect(() => {
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        if (showSaved) {
          const data = await notesApi.getBookmarkedMaterials();
          setMaterials(data);
        } else {
          const params: Record<string, string> = {};
          if (search) params.search = search;
          if (filterType) params.material_type = filterType;
          if (urlTopic) params.topic = urlTopic;
          if (urlSubject) params.subject = urlSubject;
          
          const data = await notesApi.getMaterials(params);
          setMaterials(data);
        }
      } catch (err) {
        console.error('Failed to fetch materials', err);
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchMaterials();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search, filterType, showSaved, urlTopic, urlSubject]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Study Materials</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Everything you need to prepare smarter for your Loksewa examination.
          </p>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setShowSaved(false)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${!showSaved ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            All Materials
          </button>
          <button
            onClick={() => setShowSaved(true)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${showSaved ? 'bg-white dark:bg-gray-700 text-[#C4A45C] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
          >
            <Bookmark className="w-4 h-4 mr-1" /> My Saved
          </button>
        </div>
      </div>

      {!showSaved && (
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#C4A45C] focus:border-[#C4A45C] sm:text-sm"
              placeholder="Search notes, subjects, topics..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="block w-full md:w-48 pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-[#C4A45C] focus:border-[#C4A45C] sm:text-sm rounded-md"
          >
            <option value="">All Types</option>
            <option value="notes">Notes</option>
            <option value="pdf">PDF</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="presentation">Presentation</option>
            <option value="external_link">External Link</option>
            <option value="study_guide">Study Guide</option>
            <option value="reference">Reference Material</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2E44]"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map((material) => (
            <div key={material.id} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col">
              <div className="px-4 py-5 sm:p-6 flex-1">
                <div className="flex justify-between items-start">
                  <div className="flex items-center text-xs font-medium text-[#C4A45C] uppercase tracking-wider mb-2">
                    {material.material_type === 'pdf' ? <FileText className="w-4 h-4 mr-1" /> : <BookOpen className="w-4 h-4 mr-1" />}
                    {material.material_type.replace('_', ' ')}
                  </div>
                  {material.access_type === 'premium' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                      <Lock className="w-3 h-3 mr-1" /> Premium
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-1 line-clamp-2">
                  {material.title}
                </h3>
                
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-1">
                  {material.subject_name} {material.topic_name && `• ${material.topic_name}`}
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-4">
                  {material.description || 'No description provided.'}
                </p>
                
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-4 mt-auto">
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" /> {material.estimated_reading_time} min read
                  </span>
                  {material.is_bookmarked && (
                    <span className="flex items-center text-[#C4A45C]">
                      <Bookmark className="w-3.5 h-3.5 mr-1 fill-current" /> Saved
                    </span>
                  )}
                </div>
                
                {material.progress > 0 && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-4">
                    <div className="bg-[#C4A45C] h-1.5 rounded-full" style={{ width: `${material.progress}%` }}></div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-4 sm:px-6 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href={`/student/notes/${material.id}`}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#1A2E44] hover:bg-[#2a405a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1A2E44]"
                >
                  {material.progress > 0 ? 'Continue Reading' : 'Open Material'}
                </Link>
              </div>
            </div>
          ))}
          
          {materials.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
              No materials found matching your criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NotesLandingPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2E44]"></div>
      </div>
    }>
      <NotesContent />
    </Suspense>
  );
}
