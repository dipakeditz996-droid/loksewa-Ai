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
  requiredLevels?: ('category' | 'position' | 'subject' | 'chapter' | 'topic')[];
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
  requiredLevels = ['category', 'position', 'subject'],
  errors = {},
  layout = 'grid',
  labels = {}
}: AcademicDependentSelectProps) {
  const [tree, setTree] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [chapters, setChapters] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({ tree: true });

  const levels = ['category', 'position', 'subject', 'chapter', 'topic'];
  const maxIdx = levels.indexOf(maxLevel);
  const show = (lvl: string) => levels.indexOf(lvl) <= maxIdx;
  const isRequired = (lvl: 'category' | 'position' | 'subject' | 'chapter' | 'topic') =>
    requiredLevels.includes(lvl);

  // 1. Load full academic hierarchy tree in ONE fast cached request
  useEffect(() => {
    let isMounted = true;
    setLoading(prev => ({ ...prev, tree: true, category: true }));

    adminSyllabusApi.getTreeCached()
      .then((treeData: any[]) => {
        if (!isMounted) return;
        const validTree = Array.isArray(treeData) ? treeData : [];
        setTree(validTree);
        setCategories(
          validTree.map(c => ({
            id: c.id,
            name: c.name,
            order: c.order,
            is_active: c.is_active,
          }))
        );
      })
      .catch((err) => {
        console.error('Failed to load academic tree, falling back to individual calls:', err);
        adminSyllabusApi.getCategories()
          .then((res: any) => {
            if (isMounted) setCategories(Array.isArray(res) ? res : (res?.results || []));
          })
          .catch(console.error);
      })
      .finally(() => {
        if (isMounted) setLoading(prev => ({ ...prev, tree: false, category: false }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Positions derived from selected Category (instant from tree, fallback to API)
  useEffect(() => {
    if (!category) {
      setPositions([]);
      return;
    }
    const catId = Number(category);
    const catNode = tree.find(c => c.id === catId);
    if (catNode && catNode.positions && catNode.positions.length > 0) {
      setPositions(catNode.positions);
    } else if (!loading.tree) {
      setLoading(prev => ({ ...prev, position: true }));
      adminSyllabusApi.getPositions(catId)
        .then((res: any) => setPositions(Array.isArray(res) ? res : (res?.results || [])))
        .catch(console.error)
        .finally(() => setLoading(prev => ({ ...prev, position: false })));
    }
  }, [category, tree, loading.tree]);

  // 3. Subjects derived from selected Position (instant from tree, fallback to API)
  useEffect(() => {
    if (!position) {
      setSubjects([]);
      return;
    }
    const posId = Number(position);
    let foundSubjects: any[] = [];

    for (const cat of tree) {
      for (const pos of (cat.positions || [])) {
        if (pos.id === posId) {
          const directSubs = (pos.papers || []).flatMap((p: any) => p.subjects || []);
          const childSubs = (pos.children || []).flatMap((ch: any) => (ch.papers || []).flatMap((p: any) => p.subjects || []));
          foundSubjects = [...directSubs, ...childSubs];
          break;
        }
        for (const child of (pos.children || [])) {
          if (child.id === posId) {
            foundSubjects = (child.papers || []).flatMap((p: any) => p.subjects || []);
            break;
          }
        }
        if (foundSubjects.length > 0) break;
      }
      if (foundSubjects.length > 0) break;
    }

    if (foundSubjects.length > 0) {
      const unique = Array.from(new Map(foundSubjects.map(s => [s.id, s])).values());
      setSubjects(unique);
    } else if (!loading.tree) {
      setLoading(prev => ({ ...prev, subject: true }));
      adminSyllabusApi.getSubjects(posId)
        .then((res: any) => setSubjects(Array.isArray(res) ? res : (res?.results || [])))
        .catch(console.error)
        .finally(() => setLoading(prev => ({ ...prev, subject: false })));
    }
  }, [position, tree, loading.tree]);

  // 4. Chapters derived from selected Subject (instant from tree, fallback to API)
  useEffect(() => {
    if (!subject) {
      setChapters([]);
      return;
    }
    const subId = Number(subject);
    let foundChapters: any[] = [];

    for (const cat of tree) {
      for (const pos of (cat.positions || [])) {
        const allPos = [pos, ...(pos.children || [])];
        for (const p of allPos) {
          for (const paper of (p.papers || [])) {
            for (const sub of (paper.subjects || [])) {
              if (sub.id === subId) {
                foundChapters = sub.chapters || [];
                break;
              }
            }
            if (foundChapters.length > 0) break;
          }
          if (foundChapters.length > 0) break;
        }
        if (foundChapters.length > 0) break;
      }
      if (foundChapters.length > 0) break;
    }

    if (foundChapters.length > 0) {
      setChapters(foundChapters);
    } else if (!loading.tree) {
      setLoading(prev => ({ ...prev, chapter: true }));
      adminSyllabusApi.getChapters(subId)
        .then((res: any) => setChapters(Array.isArray(res) ? res : (res?.results || [])))
        .catch(console.error)
        .finally(() => setLoading(prev => ({ ...prev, chapter: false })));
    }
  }, [subject, tree, loading.tree]);

  // 5. Topics derived from selected Chapter (instant from tree, fallback to API)
  useEffect(() => {
    if (!chapter) {
      setTopics([]);
      return;
    }
    const chapId = Number(chapter);
    let foundTopics: any[] = [];

    for (const cat of tree) {
      for (const pos of (cat.positions || [])) {
        const allPos = [pos, ...(pos.children || [])];
        for (const p of allPos) {
          for (const paper of (p.papers || [])) {
            for (const sub of (paper.subjects || [])) {
              for (const chap of (sub.chapters || [])) {
                if (chap.id === chapId) {
                  foundTopics = chap.topics || [];
                  break;
                }
              }
              if (foundTopics.length > 0) break;
            }
            if (foundTopics.length > 0) break;
          }
          if (foundTopics.length > 0) break;
        }
        if (foundTopics.length > 0) break;
      }
      if (foundTopics.length > 0) break;
    }

    if (foundTopics.length > 0) {
      setTopics(foundTopics);
    } else if (!loading.tree) {
      setLoading(prev => ({ ...prev, topic: true }));
      adminSyllabusApi.getTopics(chapId)
        .then((res: any) => setTopics(Array.isArray(res) ? res : (res?.results || [])))
        .catch(console.error)
        .finally(() => setLoading(prev => ({ ...prev, topic: false })));
    }
  }, [chapter, tree, loading.tree]);

  const handleChange = (field: string, val: string) => {
    const value = val ? Number(val) : undefined;
    onChange(field, value);

    // Automatically clear dependent child values
    if (field === 'category') {
      onChange('position', undefined);
      onChange('exam', undefined);
      onChange('subject', undefined);
      onChange('chapter', undefined);
      onChange('unit', undefined);
      onChange('topic', undefined);
    } else if (field === 'position' || field === 'exam') {
      onChange('subject', undefined);
      onChange('chapter', undefined);
      onChange('unit', undefined);
      onChange('topic', undefined);
    } else if (field === 'subject') {
      onChange('chapter', undefined);
      onChange('unit', undefined);
      onChange('topic', undefined);
    } else if (field === 'chapter' || field === 'unit') {
      onChange('topic', undefined);
    }
  };

  const containerClass = layout === 'grid' 
    ? 'grid grid-cols-1 md:grid-cols-2 gap-6' 
    : 'space-y-6';

  return (
    <div className={containerClass}>
      {/* 1. Category */}
      {show('category') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {labels.category || 'Category'} {isRequired('category') && <span className="text-red-500">*</span>}
          </label>
          <select
            value={category || ''}
            onChange={e => handleChange('category', e.target.value)}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.category ? 'border-red-500' : 'border-gray-200'}`}
          >
            <option value="">
              {loading.category ? 'Loading categories...' : 'Select Category'}
            </option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {loading.category && <p className="text-xs text-gray-400 mt-1">Loading categories...</p>}
          {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
        </div>
      )}

      {/* 2. Position / Level */}
      {show('position') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {labels.position || 'Position / Level'} {isRequired('position') && <span className="text-red-500">*</span>}
          </label>
          <select
            value={position || ''}
            onChange={e => {
              handleChange('exam', e.target.value);
              handleChange('position', e.target.value);
            }}
            disabled={!category || loading.position}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.exam || errors.position ? 'border-red-500' : 'border-gray-200'} ${!category ? 'bg-gray-50 text-gray-400' : ''}`}
          >
            <option value="">
              {!category
                ? 'Select Category first'
                : loading.position
                ? 'Loading positions...'
                : 'Select Position'}
            </option>
            {/* Grouped by Level (Exam.parent) */}
            {positions.filter(p => !p.parent).map(level => {
              const children = positions.filter(p => p.parent === level.id);
              if (children.length === 0) {
                return <option key={level.id} value={level.id}>{level.name}</option>;
              }
              return (
                <optgroup key={level.id} label={level.name}>
                  <option value={level.id}>{level.name} (General)</option>
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {loading.position && <p className="text-xs text-gray-400 mt-1">Loading positions...</p>}
          {(errors.exam || errors.position) && <p className="text-red-500 text-xs mt-1">{errors.exam || errors.position}</p>}
        </div>
      )}

      {/* 3. Subject */}
      {show('subject') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {labels.subject || 'Subject'} {isRequired('subject') && <span className="text-red-500">*</span>}
          </label>
          <select
            value={subject || ''}
            onChange={e => handleChange('subject', e.target.value)}
            disabled={!position || loading.subject}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.subject ? 'border-red-500' : 'border-gray-200'} ${!position ? 'bg-gray-50 text-gray-400' : ''}`}
          >
            <option value="">
              {!position
                ? 'Select Position first'
                : loading.subject
                ? 'Loading subjects...'
                : subjects.length === 0
                ? 'No subjects available'
                : 'Select Subject'}
            </option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {loading.subject && <p className="text-xs text-gray-400 mt-1">Loading subjects...</p>}
          {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject}</p>}
        </div>
      )}

      {/* 4. Chapter / Unit (Optional) */}
      {show('chapter') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {labels.chapter || 'Chapter / Unit'}{' '}
            {isRequired('chapter') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Optional)</span>
            )}
          </label>
          <select
            value={chapter || ''}
            onChange={e => {
              handleChange('unit', e.target.value);
              handleChange('chapter', e.target.value);
            }}
            disabled={!subject || loading.chapter}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.unit || errors.chapter ? 'border-red-500' : 'border-gray-200'} ${!subject ? 'bg-gray-50 text-gray-400' : ''}`}
          >
            <option value="">
              {!subject
                ? 'Select Subject first'
                : loading.chapter
                ? 'Loading chapters...'
                : chapters.length === 0
                ? 'No chapters available'
                : isRequired('chapter')
                ? 'Select Chapter'
                : 'Select Chapter (Optional)'}
            </option>
            {chapters.map(c => (
              <option key={c.id} value={c.id}>{c.title || c.name}</option>
            ))}
          </select>
          {loading.chapter && <p className="text-xs text-gray-400 mt-1">Loading chapters...</p>}
          {(errors.unit || errors.chapter) && <p className="text-red-500 text-xs mt-1">{errors.unit || errors.chapter}</p>}
        </div>
      )}

      {/* 5. Topic (Optional - enabled only if chapter selected) */}
      {show('topic') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {labels.topic || 'Topic'}{' '}
            {isRequired('topic') ? (
              <span className="text-red-500">*</span>
            ) : (
              <span className="text-xs text-gray-400 font-normal">(Optional)</span>
            )}
          </label>
          <select
            value={topic || ''}
            onChange={e => handleChange('topic', e.target.value)}
            disabled={!chapter || loading.topic}
            className={`w-full p-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B2545]/20 ${errors.topic ? 'border-red-500' : 'border-gray-200'} ${!chapter ? 'bg-gray-50 text-gray-400' : ''}`}
          >
            <option value="">
              {!chapter
                ? 'Select Chapter first'
                : loading.topic
                ? 'Loading topics...'
                : topics.length === 0
                ? 'No topics available'
                : isRequired('topic')
                ? 'Select Topic'
                : 'Select Topic (Optional)'}
            </option>
            {topics.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {loading.topic && <p className="text-xs text-gray-400 mt-1">Loading topics...</p>}
          {errors.topic && <p className="text-red-500 text-xs mt-1">{errors.topic}</p>}
        </div>
      )}
    </div>
  );
}
