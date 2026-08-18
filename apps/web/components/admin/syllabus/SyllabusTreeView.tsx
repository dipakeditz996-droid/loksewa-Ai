import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, Database, LayoutTemplate, Layers, BookOpen, Bookmark, Loader2 } from 'lucide-react';
import { adminSyllabusApi } from '@/lib/api/admin-syllabus';
import { QuickAddModal, SyllabusLevel } from './QuickAddModal';
import { toast } from 'react-hot-toast';

interface TreeNode {
  id: number;
  name?: string;
  title?: string;
  positions?: TreeNode[];
  subjects?: TreeNode[];
  chapters?: TreeNode[];
  topics?: TreeNode[];
}

export function SyllabusTreeView() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Expanded state
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [expandedPos, setExpandedPos] = useState<Set<number>>(new Set());
  const [expandedSub, setExpandedSub] = useState<Set<number>>(new Set());
  const [expandedChap, setExpandedChap] = useState<Set<number>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLevel, setModalLevel] = useState<SyllabusLevel>('category');
  const [modalParentId, setModalParentId] = useState<number | undefined>();

  const loadTree = async () => {
    setLoading(true);
    try {
      const data = await adminSyllabusApi.getTree();
      setTreeData(data);
    } catch (err) {
      toast.error('Failed to load syllabus hierarchy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTree();
  }, []);

  const toggleExpand = (setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
    setter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const openAddModal = (level: SyllabusLevel, parentId?: number) => {
    setModalLevel(level);
    setModalParentId(parentId);
    setModalOpen(true);
  };

  const handleDelete = async (level: SyllabusLevel, id: number) => {
    if (!window.confirm(`Are you sure you want to delete this ${level}?`)) return;
    try {
      if (level === 'category') await adminSyllabusApi.deleteCategory(id);
      else if (level === 'position') await adminSyllabusApi.deletePosition(id);
      else if (level === 'subject') await adminSyllabusApi.deleteSubject(id);
      else if (level === 'chapter') await adminSyllabusApi.deleteChapter(id);
      else if (level === 'topic') await adminSyllabusApi.deleteTopic(id);
      
      toast.success(`${level} deleted successfully`);
      loadTree();
    } catch (err: any) {
      toast.error(err.response?.data?.error || `Failed to delete ${level}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 min-h-[500px]">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-lg font-bold text-[#0B2545]">Hierarchy Explorer</h2>
          <p className="text-sm text-gray-500 mt-1">Manage the complete academic structure</p>
        </div>
        <button
          onClick={() => openAddModal('category')}
          className="flex items-center gap-2 bg-[#0B2545] hover:bg-[#163E6C] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      <div className="space-y-2">
        {treeData.map(cat => (
          <div key={`cat-${cat.id}`} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between bg-gray-50 p-3">
              <div 
                className="flex items-center gap-2 cursor-pointer flex-1"
                onClick={() => toggleExpand(setExpandedCats, cat.id)}
              >
                {expandedCats.has(cat.id) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                <Database className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-gray-800">{cat.name}</span>
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{cat.positions?.length || 0} Positions</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => openAddModal('position', cat.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Add Position">
                  <Plus className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete('category', cat.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {expandedCats.has(cat.id) && cat.positions?.map(pos => (
              <div key={`pos-${pos.id}`} className="pl-6 border-t border-gray-100 bg-white">
                <div className="flex items-center justify-between p-3">
                  <div 
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => toggleExpand(setExpandedPos, pos.id)}
                  >
                    {expandedPos.has(pos.id) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    <LayoutTemplate className="w-4 h-4 text-emerald-500" />
                    <span className="font-medium text-gray-700">{pos.name}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{pos.subjects?.length || 0} Subjects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => openAddModal('subject', pos.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Add Subject">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete('position', pos.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandedPos.has(pos.id) && pos.subjects?.map(sub => (
                  <div key={`sub-${sub.id}`} className="pl-6 border-t border-gray-50 bg-gray-50/30">
                    <div className="flex items-center justify-between p-3">
                      <div 
                        className="flex items-center gap-2 cursor-pointer flex-1"
                        onClick={() => toggleExpand(setExpandedSub, sub.id)}
                      >
                        {expandedSub.has(sub.id) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                        <Layers className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-700">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openAddModal('chapter', sub.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Add Chapter">
                          <Plus className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete('subject', sub.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {expandedSub.has(sub.id) && sub.chapters?.map(chap => (
                      <div key={`chap-${chap.id}`} className="pl-6 border-t border-gray-100 bg-white">
                        <div className="flex items-center justify-between p-3">
                          <div 
                            className="flex items-center gap-2 cursor-pointer flex-1"
                            onClick={() => toggleExpand(setExpandedChap, chap.id)}
                          >
                            {expandedChap.has(chap.id) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                            <BookOpen className="w-4 h-4 text-orange-500" />
                            <span className="text-gray-700 text-sm">{chap.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => openAddModal('topic', chap.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Add Topic">
                              <Plus className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete('chapter', chap.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {expandedChap.has(chap.id) && chap.topics?.map(topic => (
                          <div key={`top-${topic.id}`} className="pl-8 py-2 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Bookmark className="w-3 h-3 text-[#D4A72C]" />
                              {topic.name}
                            </div>
                            <button onClick={() => handleDelete('topic', topic.id)} className="p-1 text-red-400 hover:text-red-600 rounded" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {treeData.length === 0 && !loading && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
            <Database className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No syllabus categories found</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Start by creating a top-level category.</p>
            <button
              onClick={() => openAddModal('category')}
              className="inline-flex items-center gap-2 bg-[#0B2545] hover:bg-[#163E6C] text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Category
            </button>
          </div>
        )}
      </div>

      <QuickAddModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        level={modalLevel}
        parentId={modalParentId}
        onSuccess={loadTree}
      />
    </div>
  );
}
