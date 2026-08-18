"use client";

import React, { useState } from "react";
import { 
  ChevronRight, ChevronDown, Folder, FileText, CheckSquare, 
  BookOpen, Layers, Plus, Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockExamCategories, mockPositions, mockSubjects, mockChapters, mockTopics } from "@/lib/mock/admin-academic";

// Very basic custom tree view
const TreeItem = ({ 
  label, icon: Icon, children, isExpanded, onToggle, onClick, isSelected, level = 0
}: any) => {
  return (
    <div className="select-none">
      <div 
        className={`flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer hover:bg-slate-100 ${isSelected ? 'bg-slate-100 text-[#0B2545] font-medium' : 'text-slate-600'}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={(e) => {
          onClick();
        }}
      >
        <span 
          className="w-4 h-4 flex items-center justify-center cursor-pointer hover:bg-slate-200 rounded"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {children ? (isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />) : <span className="w-3.5 h-3.5" />}
        </span>
        <Icon className={`w-4 h-4 ${isSelected ? 'text-[#D4A72C]' : 'text-slate-400'}`} />
        <span className="text-sm truncate">{label}</span>
      </div>
      {isExpanded && children && (
        <div className="flex flex-col">
          {children}
        </div>
      )}
    </div>
  );
};

export default function SyllabusBuilderPage() {
  // Store expanded state for IDs
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'cat1': true,
    'pos1': true
  });
  const [selectedNode, setSelectedNode] = useState<any>(null);

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSelect = (node: any) => {
    setSelectedNode(node);
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col space-y-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-bold text-[#0B2545]">Syllabus Builder</h2>
          <p className="text-slate-500 text-sm mt-1">Visualize and arrange the complete academic hierarchy.</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Left pane: Tree */}
        <div className="w-full md:w-1/3 border-r border-slate-200 flex flex-col h-full bg-slate-50/30">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <Folder className="w-4 h-4 text-slate-500" /> Structure
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {mockExamCategories.map(cat => (
              <TreeItem 
                key={cat.id} 
                label={cat.shortName} 
                icon={CheckSquare}
                level={0}
                isExpanded={expanded[cat.id]}
                isSelected={selectedNode?.id === cat.id}
                onToggle={() => toggleExpand(cat.id)}
                onClick={() => handleSelect({...cat, type: 'category'})}
              >
                {mockPositions.filter(p => p.categoryId === cat.id).map(pos => (
                  <TreeItem 
                    key={pos.id} 
                    label={pos.name} 
                    icon={FileText}
                    level={1}
                    isExpanded={expanded[pos.id]}
                    isSelected={selectedNode?.id === pos.id}
                    onToggle={() => toggleExpand(pos.id)}
                    onClick={() => handleSelect({...pos, type: 'position'})}
                  >
                    {pos.requiredSubjects.map(subId => {
                      const subject = mockSubjects.find(s => s.id === subId);
                      if (!subject) return null;
                      return (
                        <TreeItem 
                          key={subject.id} 
                          label={subject.name} 
                          icon={BookOpen}
                          level={2}
                          isExpanded={expanded[`${pos.id}-${subject.id}`]}
                          isSelected={selectedNode?.id === subject.id}
                          onToggle={() => toggleExpand(`${pos.id}-${subject.id}`)}
                          onClick={() => handleSelect({...subject, type: 'subject'})}
                        >
                          {mockChapters.filter(c => c.subjectId === subject.id).map(chap => (
                            <TreeItem 
                              key={chap.id} 
                              label={chap.name} 
                              icon={Layers}
                              level={3}
                              isExpanded={expanded[`${pos.id}-${subject.id}-${chap.id}`]}
                              isSelected={selectedNode?.id === chap.id}
                              onToggle={() => toggleExpand(`${pos.id}-${subject.id}-${chap.id}`)}
                              onClick={() => handleSelect({...chap, type: 'chapter'})}
                            >
                              {mockTopics.filter(t => t.chapterId === chap.id).map(topic => (
                                <TreeItem 
                                  key={topic.id} 
                                  label={topic.name} 
                                  icon={FileText}
                                  level={4}
                                  isSelected={selectedNode?.id === topic.id}
                                  onToggle={() => {}}
                                  onClick={() => handleSelect({...topic, type: 'topic'})}
                                />
                              ))}
                            </TreeItem>
                          ))}
                        </TreeItem>
                      );
                    })}
                  </TreeItem>
                ))}
              </TreeItem>
            ))}
          </div>
        </div>

        {/* Right pane: Editor Details */}
        <div className="flex-1 bg-white p-6 overflow-y-auto">
          {!selectedNode ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Folder className="w-16 h-16 mb-4 text-slate-200" />
              <p>Select an item from the tree to view its details.</p>
            </div>
          ) : (
            <div className="max-w-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{selectedNode.type}</p>
                  <h3 className="text-2xl font-bold text-[#0B2545]">{selectedNode.name}</h3>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-4 h-4" /> Edit
                </Button>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-2">Description</h4>
                  <p className="text-slate-600 text-sm bg-slate-50 p-4 rounded-lg border border-slate-100">
                    {selectedNode.description || "No description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedNode.type === 'subject' && (
                    <div className="p-4 border border-slate-100 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Subject Code</p>
                      <p className="font-medium text-slate-900">{selectedNode.code}</p>
                    </div>
                  )}
                  {selectedNode.type === 'position' && (
                    <div className="p-4 border border-slate-100 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Level</p>
                      <p className="font-medium text-slate-900">{selectedNode.level}</p>
                    </div>
                  )}
                  {selectedNode.status && (
                    <div className="p-4 border border-slate-100 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        selectedNode.status === 'Active' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-600 bg-slate-100'
                      }`}>
                        {selectedNode.status}
                      </span>
                    </div>
                  )}
                </div>

                {/* contextual add buttons */}
                <div className="pt-6 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-900 mb-4">Quick Actions</h4>
                  <div className="flex flex-wrap gap-3">
                    {selectedNode.type === 'category' && (
                      <Button variant="secondary" className="gap-2 text-sm"><Plus className="w-4 h-4" /> Add Position</Button>
                    )}
                    {selectedNode.type === 'position' && (
                      <Button variant="secondary" className="gap-2 text-sm"><Plus className="w-4 h-4" /> Link Subject</Button>
                    )}
                    {selectedNode.type === 'subject' && (
                      <Button variant="secondary" className="gap-2 text-sm"><Plus className="w-4 h-4" /> Add Chapter</Button>
                    )}
                    {selectedNode.type === 'chapter' && (
                      <Button variant="secondary" className="gap-2 text-sm"><Plus className="w-4 h-4" /> Add Topic</Button>
                    )}
                    {(selectedNode.type === 'topic' || selectedNode.type === 'chapter') && (
                      <Button variant="outline" className="gap-2 text-sm">Add Question</Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
