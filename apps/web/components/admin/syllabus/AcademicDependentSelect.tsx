'use client';

import { useState, useEffect } from 'react';
import { adminSyllabusApi } from '@/lib/api/admin-syllabus';

interface AcademicDependentSelectProps {
  category?: number | string | null;
  position?: number | string | null;
  subject?: number | string | null;
  chapter?: number | string | null;
  topic?: number | string | null;
  onChange: (field: string, value: any) => void;
  maxLevel?: 'category' | 'position' | 'subject' | 'chapter' | 'topic';
  errors?: Record<string, string>;
  layout?: 'vertical' | 'grid';
  labels?: Record<string, string>;
}

export function AcademicDependentSelect({
  category,
  position,
  subject,
  chapter,
  topic,
  onChange,
  maxLevel = 'topic',
  errors = {},
  layout = 'grid',
  labels = {}
}: AcademicDependentSelectProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const levels = ['category', 'position', 'subject', 'chapter', 'topic'];
  const maxIdx = levels.indexOf(maxLevel);
  const show = (lvl: string) => levels.indexOf(lvl) <= maxIdx;

  useEffect(() => {
    setLoading(prev => ({ ...prev, category: true }));
    adminSyllabusApi.getCategories()
      .then((res: any) => setCategories(Array.isArray(res) ? res : (res?.results || [])))
      .catch(console.error)
      .finally(() => setLoading(prev => ({ ...prev, category: false })));
  }, []);

  useEffect(() => {
    setPositions([]);
    if (category) {
      setLoading(prev => ({ ...prev, position: true }));
      adminSyllabusApi.getPositions(Number(category))
        .then((res: any) => setPositions(Array.isArray(res) ? res : (res?.results || [])))
        .catch(console.error)
        .finally(() => setLoading(prev => ({ ...prev, position: false })));
    }
  }, [category]);

  useEffect(() => {
    setSubjects([]);
    if (position) {
      setLoading(prev => ({ ...prev, subject: true }));
      adminSyllabusApi.getSubjects(Number(position))
        .then((res: any) => setSubjects(Array.isArray(res) ? res : (res?.results || [])))
        .catch(console.error)
        .finally(() => setLoading(prev => ({ ...prev, subject: false })));
    }
  }, [position]);

  useEffect(() => {
    setChapters([]);
    if (subject) {
      setLoading(prev => ({ ...prev, chapter: true }));
      adminSyllabusApi.getChapters(Number(subject))
        .then((res: any) => setChapters(Array.isArray(res) ? res : (res?.results || [])))
        .catch(console.error)
        .finally(() => setLoading(prev => ({ ...prev, chapter: false })));
    }
  }, [subject]);

  useEffect(() => {
    setTopics([]);
    if (chapter) {
      setLoading(prev => ({ ...prev, topic: true }));
      adminSyllabusApi.getTopics(Number(chapter))
        .then((res: any) => setTopics(Array.isArray(res) ? res : (res?.results || [])))
        .catch(console.error)
        .finally(() => setLoading(prev => ({ ...prev, topic: false })));
    }
  }, [chapter]);

  const handleChange = (field: string, val: string) => {
    const value = val ? Number(val) : undefined;
    onChange(field, value);
  };

  const containerClass = layout === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
    : 'space-y-6';

  return (
    <div className={containerClass}>
      {show('category') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.category || 'Category'} *</label>
          <select
            value={category || ''}
            onChange={e => handleChange('category', e.target.value)}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.category ? 'border-red-500' : 'border-gray-200'}`}
          >
            <option value="">Select Category</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {loading.category && <p className="text-xs text-gray-400 mt-1">Loading...</p>}
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
        </div>
      )}

      {show('position') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.position || 'Position / Level'} *</label>
          <select
            value={position || ''}
            onChange={e => {
              handleChange('exam', e.target.value);
              handleChange('position', e.target.value);
            }}
            disabled={!category}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.exam || errors.position ? 'border-red-500' : 'border-gray-200'} ${!category ? 'bg-gray-50' : ''}`}
          >
            <option value="">Select Position</option>
            {positions.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {loading.position && <p className="text-xs text-gray-400 mt-1">Loading...</p>}
          {(errors.exam || errors.position) && <p className="text-red-500 text-xs mt-1">{errors.exam || errors.position}</p>}
        </div>
      )}

      {show('subject') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.subject || 'Subject'} *</label>
          <select
            value={subject || ''}
            onChange={e => handleChange('subject', e.target.value)}
            disabled={!position}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.subject ? 'border-red-500' : 'border-gray-200'} ${!position ? 'bg-gray-50' : ''}`}
          >
            <option value="">Select Subject</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {loading.subject && <p className="text-xs text-gray-400 mt-1">Loading...</p>}
          {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
        </div>
      )}

      {show('chapter') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.chapter || 'Chapter / Unit'} *</label>
          <select
            value={chapter || ''}
            onChange={e => {
              handleChange('unit', e.target.value);
              handleChange('chapter', e.target.value);
            }}
            disabled={!subject}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.unit || errors.chapter ? 'border-red-500' : 'border-gray-200'} ${!subject ? 'bg-gray-50' : ''}`}
          >
            <option value="">Select Chapter</option>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>{c.title || c.name}</option>
            ))}
          </select>
          {loading.chapter && <p className="text-xs text-gray-400 mt-1">Loading...</p>}
          {(errors.unit || errors.chapter) && <p className="text-red-500 text-xs mt-1">{errors.unit || errors.chapter}</p>}
        </div>
      )}

      {show('topic') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{labels.topic || 'Topic'} *</label>
          <select
            value={topic || ''}
            onChange={e => handleChange('topic', e.target.value)}
            disabled={!chapter}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.topic ? 'border-red-500' : 'border-gray-200'} ${!chapter ? 'bg-gray-50' : ''}`}
          >
            <option value="">Select Topic</option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {loading.topic && <p className="text-xs text-gray-400 mt-1">Loading...</p>}
          {errors.topic && <p className="text-red-500 text-xs mt-1">{errors.topic}</p>}
        </div>
      )}
    </div>
  );
}
