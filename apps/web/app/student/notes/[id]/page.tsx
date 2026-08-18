'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bookmark, BookOpen, Clock, Download, CheckCircle } from 'lucide-react';
import { notesApi, StudyMaterial } from '@/lib/api/notes';

export default function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [material, setMaterial] = useState<StudyMaterial | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookmarking, setBookmarking] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      try {
        const data = await notesApi.getMaterial(resolvedParams.id);
        setMaterial(data);
      } catch (err) {
        console.error('Failed to fetch material', err);
        alert("Could not load material. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchMaterial();
  }, [resolvedParams.id]);

  // Scroll spy for progress
  useEffect(() => {
    if (!material || material.progress >= 100) return;

    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        if (!contentRef.current) return;
        
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        // Calculate progress percentage
        let percentage = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100);
        if (percentage > 100) percentage = 100;
        if (percentage < 0) percentage = 0;
        
        // If they reach the bottom, make it 100
        if (clientHeight + scrollTop >= scrollHeight - 50) {
          percentage = 100;
        }

        // Only update if it's a significant jump (e.g. 25, 50, 75, 100) to save API calls
        if (percentage > material.progress && (percentage === 100 || percentage % 25 === 0)) {
          notesApi.updateProgress(material.id, percentage)
            .then(res => setMaterial(prev => prev ? {...prev, progress: res.progress} : prev))
            .catch(console.error);
        }
      }, 500); // debounce
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [material]);

  const toggleBookmark = async () => {
    if (!material) return;
    setBookmarking(true);
    try {
      const action = material.is_bookmarked ? 'unbookmark' : 'bookmark';
      await notesApi.toggleBookmark(material.id, action);
      setMaterial(prev => prev ? {...prev, is_bookmarked: !prev.is_bookmarked} : prev);
    } catch (err) {
      alert("Could not update bookmark.");
    } finally {
      setBookmarking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1A2E44]"></div>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Material not found</h2>
        <Link href="/student/notes" className="text-[#C4A45C] hover:underline mt-4 inline-block">
          Return to Notes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Navigation & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <Link href="/student/notes" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Notes
        </Link>
        <div className="flex items-center gap-3">
          {material.material_type === 'pdf' && material.file && (
            <a 
              href={material.file} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
            >
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </a>
          )}
          <button 
            onClick={toggleBookmark}
            disabled={bookmarking}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <Bookmark className={`w-4 h-4 mr-2 ${material.is_bookmarked ? 'fill-[#C4A45C] text-[#C4A45C]' : ''}`} /> 
            {material.is_bookmarked ? 'Saved' : 'Save Note'}
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="mb-10 pb-8 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#1A2E44]/10 text-[#1A2E44] dark:bg-blue-900/30 dark:text-blue-200">
            {material.subject_name}
          </span>
          {material.topic_name && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              {material.topic_name}
            </span>
          )}
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
          {material.title}
        </h1>
        
        <div className="flex flex-wrap items-center text-sm text-gray-500 dark:text-gray-400 gap-x-6 gap-y-2">
          <span className="flex items-center">
            <BookOpen className="w-4 h-4 mr-2" /> {material.material_type.replace('_', ' ')}
          </span>
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-2" /> {material.estimated_reading_time} min read
          </span>
          <span className="flex items-center">
            Last updated: {new Date(material.updated_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="prose prose-lg dark:prose-invert max-w-none prose-blue">
        {material.material_type === 'pdf' ? (
          <div className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 h-[800px] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            {material.file ? (
              <iframe 
                src={`${material.file}#view=FitH`} 
                className="w-full h-full"
                title={material.title}
              />
            ) : (
              <p className="text-gray-500">PDF file not found.</p>
            )}
          </div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: material.content || 'No content available.' }} />
        )}
      </div>

      {/* Footer / Complete Button */}
      <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
        {material.progress >= 100 ? (
          <div className="inline-flex flex-col items-center">
            <CheckCircle className="w-12 h-12 text-green-500 mb-2" />
            <span className="text-lg font-medium text-gray-900 dark:text-white">You've completed this material!</span>
          </div>
        ) : (
          <button 
            onClick={() => notesApi.updateProgress(material.id, 100).then(() => setMaterial({...material, progress: 100}))}
            className="inline-flex justify-center items-center py-3 px-6 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[#1A2E44] hover:bg-[#2a405a]"
          >
            Mark as Complete
          </button>
        )}
      </div>
    </div>
  );
}
