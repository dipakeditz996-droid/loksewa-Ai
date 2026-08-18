import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminSyllabusApi } from '@/lib/api/admin-syllabus';

export type SyllabusLevel = 'category' | 'position' | 'subject' | 'chapter' | 'topic';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: SyllabusLevel;
  parentId?: number;
  onSuccess: () => void;
}

export function QuickAddModal({ isOpen, onClose, level, parentId, onSuccess }: QuickAddModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      if (level === 'category') {
        await adminSyllabusApi.createCategory({ name, description: '' });
      } else if (level === 'position') {
        await adminSyllabusApi.createPosition({ name, category: parentId!, description: '' });
      } else if (level === 'subject') {
        await adminSyllabusApi.createSubject({ name, exam: parentId!, code: '' });
      } else if (level === 'chapter') {
        await adminSyllabusApi.createChapter({ title: name, subject: parentId! });
      } else if (level === 'topic') {
        await adminSyllabusApi.createTopic({ name, unit: parentId! });
      }
      
      toast.success(`${level.charAt(0).toUpperCase() + level.slice(1)} added successfully`);
      setName('');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(`Failed to add ${level}`);
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (level) {
      case 'category': return 'Add Category';
      case 'position': return 'Add Position';
      case 'subject': return 'Add Subject';
      case 'chapter': return 'Add Chapter';
      case 'topic': return 'Add Topic';
      default: return 'Add Item';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{getTitle()}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`Enter ${level} name...`}
              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B2545]/20 focus:border-[#0B2545] outline-none"
              autoFocus
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#0B2545] hover:bg-[#163E6C] rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
