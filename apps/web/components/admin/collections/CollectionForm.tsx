'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { adminCollectionsApi, QuestionCollection } from '@/lib/api/admin-collections';
import { toast } from 'react-hot-toast';

const ICON_OPTIONS = ['Folder', 'BookOpen', 'Brain', 'Star', 'Target', 'Zap', 'Award', 'Layers', 'Grid', 'List'];
const COLOR_OPTIONS = [
  { label: 'Navy', value: '#0B2545' },
  { label: 'Blue', value: '#2563eb' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Red', value: '#dc2626' },
  { label: 'Pink', value: '#db2777' },
  { label: 'Teal', value: '#0d9488' },
  { label: 'Yellow', value: '#ca8a04' },
  { label: 'Gray', value: '#4b5563' },
];

interface CollectionFormProps {
  collection?: QuestionCollection; // if editing
  onSaved?: (collection: QuestionCollection) => void;
}

export default function CollectionForm({ collection, onSaved }: CollectionFormProps) {
  const router = useRouter();
  const isEditing = !!collection;

  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [color, setColor] = useState(collection?.color ?? '#0B2545');
  const [icon, setIcon] = useState(collection?.icon ?? 'Folder');
  const [collectionStatus, setCollectionStatus] = useState<'active' | 'inactive'>(collection?.status ?? 'active');
  // Auto rules
  const [keywords, setKeywords] = useState<string[]>(collection?.rule?.keywords ?? []);
  const [keywordInput, setKeywordInput] = useState('');
  const [applyToNew, setApplyToNew] = useState(collection?.rule?.apply_to_new ?? true);
  const [applyToCsv, setApplyToCsv] = useState(collection?.rule?.apply_to_csv ?? true);

  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Track dirty state
  useEffect(() => {
    setIsDirty(true);
  }, [name, description, color, icon, collectionStatus, keywords, applyToNew, applyToCsv]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty && !saving) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty, saving]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Collection name is required.';
    if (name.trim().length > 255) errs.name = 'Name must be 255 characters or less.';
    return errs;
  };

  const buildPayload = () => ({
    name: name.trim(),
    description: description.trim(),
    color,
    icon,
    status: collectionStatus,
    rule: {
      keywords,
      apply_to_new: applyToNew,
      apply_to_csv: applyToCsv,
    },
  });

  const handleSave = async (andAddQuestions = false) => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      let saved: QuestionCollection;
      if (isEditing && collection) {
        saved = await adminCollectionsApi.updateCollection(collection.id, buildPayload());
        toast.success('Collection updated successfully!');
      } else {
        saved = await adminCollectionsApi.createCollection(buildPayload());
        toast.success('Collection created successfully!');
      }
      setIsDirty(false);
      if (onSaved) onSaved(saved);
      if (andAddQuestions) {
        router.push(`/admin-dashboard/academic/collections/${saved.id}?addQuestions=1`);
      } else {
        router.push('/admin-dashboard/academic/collections');
      }
    } catch (err: any) {
      const msg = err?.message || 'Unable to save collection. Please try again.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isDirty) {
      const confirmed = window.confirm('You have unsaved changes. Discard changes and leave?');
      if (!confirmed) return;
    }
    router.push('/admin-dashboard/academic/collections');
  };

  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw)) {
      setKeywords([...keywords, kw]);
    }
    setKeywordInput('');
  };

  const removeKeyword = (kw: string) => setKeywords(keywords.filter(k => k !== kw));

  return (
    <div className="p-5 md:p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Collection' : 'Create Collection'}
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {isEditing ? 'Update collection details.' : 'Create a new question collection.'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">

        {/* Basic Info */}
        <div className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Collection Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: '' })); }}
              placeholder="e.g. Loksewa PSC Previous Papers"
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/30 ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> {errors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description of this collection..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/30 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={collectionStatus}
              onChange={e => setCollectionStatus(e.target.value as 'active' | 'inactive')}
              className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/30"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Appearance */}
        <div className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Appearance</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  title={c.label}
                  className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    color === c.value ? 'border-gray-900 scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    icon === ic
                      ? 'bg-[#0B2545] text-white border-[#0B2545]'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: color }}
            >
              {name ? name[0]?.toUpperCase() : icon[0]?.toUpperCase() ?? 'F'}
            </div>
            <div>
              <p className="font-medium text-sm text-gray-900">{name || 'Collection Name'}</p>
              <p className="text-xs text-gray-500">{description || 'No description'}</p>
            </div>
          </div>
        </div>

        {/* Auto Rules */}
        <div className="p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Auto Rules</h2>
          <p className="text-sm text-gray-500">Questions matching these keywords will be auto-suggested for this collection.</p>

          <div className="flex gap-2">
            <input
              type="text"
              value={keywordInput}
              onChange={e => setKeywordInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword(); } }}
              placeholder="Add a keyword and press Enter..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B2545]/30"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="px-4 py-2 bg-[#0B2545] text-white rounded-lg text-sm font-medium hover:bg-[#163E6C] transition-colors"
            >
              Add
            </button>
          </div>

          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {keywords.map(kw => (
                <span key={kw} className="flex items-center gap-1 bg-navy-50 border border-navy-200 text-navy-800 px-2.5 py-1 rounded-full text-xs font-medium">
                  {kw}
                  <button onClick={() => removeKeyword(kw)} className="ml-1 text-gray-400 hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToNew}
                onChange={e => setApplyToNew(e.target.checked)}
                className="w-4 h-4 rounded text-[#0B2545]"
              />
              <span className="text-sm text-gray-700">Apply to new questions</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyToCsv}
                onChange={e => setApplyToCsv(e.target.checked)}
                className="w-4 h-4 rounded text-[#0B2545]"
              />
              <span className="text-sm text-gray-700">Apply to CSV imports</span>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons — Sticky Footer */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-xl -mx-0 px-6 py-4 flex justify-between items-center shadow-lg z-10">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>

        <div className="flex items-center gap-3">
          {!isEditing && (
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-5 py-2.5 border border-[#0B2545] text-[#0B2545] rounded-lg text-sm font-medium hover:bg-[#0B2545]/5 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save & Add Questions
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-6 py-2.5 bg-[#0B2545] hover:bg-[#163E6C] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70 flex items-center gap-2 shadow-md"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> {isEditing ? 'Save Changes' : 'Save Collection'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
