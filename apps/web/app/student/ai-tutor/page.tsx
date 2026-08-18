"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { tutorApi, Conversation, Message } from "@/lib/api/tutor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Bot, 
  Send, 
  Plus, 
  MessageSquare, 
  Trash2, 
  Loader2, 
  BookOpen, 
  Lightbulb, 
  Brain, 
  Target, 
  Calendar,
  AlertCircle
} from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MODES = [
  { id: 'EXPLAIN', label: 'Explain', icon: Lightbulb, description: 'Get clear explanations for Loksewa topics' },
  { id: 'PRACTICE', label: 'Practice', icon: Brain, description: 'Generate mock MCQs' },
  { id: 'REVISION', label: 'Revision', icon: BookOpen, description: 'Quick summaries and key facts' },
  { id: 'EXAM_STRATEGY', label: 'Strategy', icon: Target, description: 'Exam prep tips and tricks' },
  { id: 'STUDY_PLAN', label: 'Study Plan', icon: Calendar, description: 'Plan your study schedule' },
] as const;

export default function AITutorPage() {
  const { user } = useAuth();
  
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [selectedMode, setSelectedMode] = useState<string>('EXPLAIN');
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const loadConversations = async () => {
    try {
      const data = await tutorApi.getConversations();
      setConversations(data || []);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  const loadMessages = async (id: number) => {
    setIsLoading(true);
    try {
      const data = await tutorApi.getConversation(id);
      setMessages(data.messages || []);
      if (data.mode) setSelectedMode(data.mode);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setError("Failed to load conversation history.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = async (mode: string) => {
    setIsLoading(true);
    try {
      const newConv = await tutorApi.createConversation({
        title: "New Conversation",
        mode: mode
      });
      setConversations([newConv, ...conversations]);
      setActiveConversationId(newConv.id);
      setSelectedMode(mode);
    } catch (err) {
      setError("Failed to create conversation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConversation = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    
    try {
      await tutorApi.deleteConversation(id);
      setConversations(conversations.filter(c => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
    } catch (err) {
      setError("Failed to delete conversation.");
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    setError(null);
    
    let convId = activeConversationId;
    
    // Auto-create conversation if none is active
    if (!convId) {
      try {
        const newConv = await tutorApi.createConversation({
          title: inputValue.substring(0, 30) + (inputValue.length > 30 ? "..." : ""),
          mode: selectedMode
        });
        setConversations([newConv, ...conversations]);
        convId = newConv.id;
        setActiveConversationId(convId);
      } catch (err) {
        setError("Failed to initialize conversation.");
        return;
      }
    }

    const currentInput = inputValue;
    setInputValue("");
    
    // Optimistically add user message to UI
    const optimisticUserMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: currentInput,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticUserMsg]);
    setIsLoading(true);

    try {
      const response = await tutorApi.sendMessage(convId, currentInput);
      
      // Update title of conversation if it's new
      if (messages.length === 0) {
        setConversations(prev => prev.map(c => 
          c.id === convId ? { ...c, title: currentInput.substring(0, 30) + "..." } : c
        ));
      }
      
      // Replace optimistic message and add AI response
      setMessages(prev => [
        ...prev.filter(m => m.id !== optimisticUserMsg.id), 
        response.user_message, 
        response.assistant_message
      ]);
      
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || "Failed to send message. Please try again.");
      setInputValue(currentInput);
      setMessages(prev => prev.filter(m => m.id !== optimisticUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  };

  const activeModeDetails = MODES.find(m => m.id === selectedMode) || MODES[0];

  return (
    <div className="flex h-[calc(100vh-72px)] bg-slate-50 overflow-hidden">
      
      {/* Sidebar - Conversation History */}
      <aside className="w-72 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-[#0B2545] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#D4A72C]" />
            Conversations
          </h2>
        </div>
        
        <div className="p-4">
          <Button 
            className="w-full bg-[#0B2545] hover:bg-[#1a365d] text-white flex items-center gap-2"
            onClick={() => {
              setActiveConversationId(null);
              setMessages([]);
            }}
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.length === 0 && !isInitializing ? (
            <p className="text-sm text-slate-500 text-center py-4">No previous conversations.</p>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv.id}
                onClick={() => setActiveConversationId(conv.id)}
                className={`p-3 rounded-lg cursor-pointer flex items-start justify-between group transition-colors ${activeConversationId === conv.id ? 'bg-slate-100 border border-slate-200' : 'hover:bg-slate-50 border border-transparent'}`}
              >
                <div className="min-w-0 pr-2">
                  <h3 className={`text-sm font-medium truncate ${activeConversationId === conv.id ? 'text-[#0B2545]' : 'text-slate-700'}`}>
                    {conv.title}
                  </h3>
                  <p className="text-xs text-slate-500 capitalize mt-1">
                    {conv.mode ? conv.mode.replace('_', ' ') : 'Explain'}
                  </p>
                </div>
                <button 
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative">
        
        {/* Chat Header */}
        <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 shrink-0 bg-white z-10 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0B2545]/10 flex items-center justify-center">
              <Bot className="w-6 h-6 text-[#0B2545]" />
            </div>
            <div>
              <h1 className="font-bold text-[#0B2545] leading-tight">AI Tutor</h1>
              <p className="text-xs text-slate-500">Your personal Loksewa preparation assistant.</p>
            </div>
          </div>
        </header>

        {/* Chat Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50">
          
          {!activeConversationId && messages.length === 0 ? (
            // Empty State / Mode Selector
            <div className="h-full flex flex-col items-center justify-center max-w-3xl mx-auto text-center px-4">
              <div className="w-16 h-16 bg-[#0B2545] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#0B2545] mb-2">How can I help with your preparation?</h2>
              <p className="text-slate-500 mb-8 max-w-lg">Select a mode below to customize my behavior, or just start typing to ask a general question.</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                {MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = selectedMode === mode.id;
                  return (
                    <Card 
                      key={mode.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-[#0B2545] border-transparent' : 'hover:border-slate-300'}`}
                      onClick={() => setSelectedMode(mode.id)}
                    >
                      <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                        <div className={`p-3 rounded-full ${isSelected ? 'bg-[#0B2545] text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-[#0B2545]">{mode.label}</h3>
                          <p className="text-xs text-slate-500 mt-1">{mode.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            // Messages List
            <div className="max-w-4xl mx-auto space-y-6 pb-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 shrink-0 rounded-full bg-[#0B2545] flex items-center justify-center mt-1 shadow-sm">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-[#0B2545] text-white rounded-tr-sm' 
                      : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                  }`}>
                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</div>
                    ) : (
                      <div className="prose prose-sm md:prose-base max-w-none prose-slate prose-p:leading-relaxed prose-pre:bg-slate-800 prose-pre:text-slate-100">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>

                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-[#0B2545] flex items-center justify-center mt-1">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-200 shrink-0">
          <div className="max-w-4xl mx-auto">
            {error && (
              <div className="mb-3 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            
            <div className="relative flex items-end gap-2">
              <div className="relative flex-1 bg-white rounded-xl shadow-sm border border-slate-300 focus-within:border-[#0B2545] focus-within:ring-1 focus-within:ring-[#0B2545] transition-all overflow-hidden">
                {!activeConversationId && (
                  <div className="absolute top-0 left-0 right-0 h-8 bg-slate-50 border-b border-slate-200 flex items-center px-3 text-xs font-medium text-slate-500">
                    <ActiveModeIcon mode={activeModeDetails.icon} />
                    <span className="ml-2">Mode: {activeModeDetails.label}</span>
                  </div>
                )}
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={!activeConversationId ? "Type your question here to start..." : "Reply to AI Tutor..."}
                  className={`w-full bg-transparent border-0 focus:ring-0 resize-none p-3 text-[15px] min-h-[52px] max-h-32 ${!activeConversationId ? 'pt-10' : ''}`}
                  rows={1}
                  disabled={isLoading}
                  style={{ overflowY: 'auto' }}
                />
              </div>
              <Button 
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className={`h-12 w-12 rounded-xl shrink-0 p-0 transition-all ${
                  inputValue.trim() && !isLoading 
                    ? 'bg-[#0B2545] hover:bg-[#1a365d] text-white shadow-md' 
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
              </Button>
            </div>
            
            <div className="text-center mt-3">
              <p className="text-[11px] text-slate-400">
                AI Tutor can make mistakes. Consider verifying important facts from the official syllabus.
              </p>
            </div>
          </div>
        </div>
      </main>

    </div>
  );
}

function ActiveModeIcon({ mode: Icon }: { mode: any }) {
  return <Icon className="w-3.5 h-3.5" />;
}
