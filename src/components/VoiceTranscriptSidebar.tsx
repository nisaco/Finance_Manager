import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Copy,
  Check,
  Trash2,
  Send,
  MessageSquare,
  Sparkles,
  ArrowDown,
  User,
  Pencil,
} from 'lucide-react';

export interface TranscriptItem {
  id: string;
  speaker: 'fima' | 'user';
  text: string;
  timestamp: string;
}

interface VoiceTranscriptSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  transcripts: TranscriptItem[];
  onClearTranscripts: () => void;
  status: 'connecting' | 'connected' | 'speaking' | 'listening' | 'error' | 'disconnected';
  onSendMessage: (text: string) => void;
  onEditPrompt?: (id: string, newText: string) => void;
}

export const VoiceTranscriptSidebar: React.FC<VoiceTranscriptSidebarProps> = ({
  isOpen,
  onClose,
  transcripts,
  onClearTranscripts,
  status,
  onSendMessage,
  onEditPrompt,
}) => {
  const [localInput, setLocalInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new transcripts
  useEffect(() => {
    if (isOpen && messagesEndRef.current && !editingId) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcripts, isOpen, editingId]);

  // Focus the edit input when starting to edit a prompt
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.setSelectionRange(
        editInputRef.current.value.length,
        editInputRef.current.value.length
      );
    }
  }, [editingId]);

  // Lock body scroll when sidebar is open to prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          if (editingId) {
            setEditingId(null);
          } else {
            onClose();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow === 'hidden' ? '' : originalOverflow;
        document.body.style.touchAction = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }, [isOpen, onClose, editingId]);

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || localInput).trim();
    if (!text) return;
    onSendMessage(text);
    if (!textToSend) setLocalInput('');
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 2000);
  };

  const startEditPrompt = (item: TranscriptItem) => {
    setEditingId(item.id);
    setEditText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    const trimmed = editText.trim();
    if (!trimmed) return;
    if (onEditPrompt) {
      onEditPrompt(id, trimmed);
    } else {
      onSendMessage(trimmed);
    }
    setEditingId(null);
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* 1. Backdrop: Blurs the rest of the screen and prevents scrolling */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* 2. Sidebar Drawer: Completely OPAQUE (Solid #0E131B), ZERO glass effect, NO transparency */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] md:w-[480px] max-w-[100vw] sm:max-w-[85vw] h-[100dvh] max-h-[100dvh] bg-[#0E131B] text-white flex flex-col border-l border-white/10 shadow-[-16px_0_40px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-in-out overscroll-contain touch-pan-y ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        role="dialog"
        aria-label="Conversation Transcript"
        aria-modal="true"
      >
        {/* Top Header: 100% Solid Opaque Background (#141B26), Clean title, No unneeded subtitles */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 bg-[#141B26] border-b border-white/10 shrink-0">
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm sm:text-base font-bold text-white">Live Transcript</h2>
                {status === 'speaking' ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Speaking</span>
                  </span>
                ) : status === 'listening' ? (
                  <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Listening</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {transcripts.length > 0 && (
              <button
                onClick={onClearTranscripts}
                className="p-2 rounded-lg bg-white/5 hover:bg-rose-950/40 text-white/60 hover:text-rose-400 transition-colors cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close transcript"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages Body: Solid #0A0E15 Background */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-5 bg-[#0A0E15] select-text overscroll-contain"
        >
          {transcripts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-white/40">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-emerald-400 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-white/80 mb-1">No conversation recorded yet</h3>
              <p className="text-xs text-white/50 max-w-xs leading-relaxed mb-4">
                Speak aloud to Fima or choose a prompt below to start the conversation.
              </p>

              {/* Sample Quick Questions to Test */}
              <div className="w-full max-w-xs space-y-2">
                {[
                  'What is my current net balance?',
                  'Audit my recent spending',
                  'Review my savings vaults',
                ].map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/80 hover:text-white transition-all active:scale-[0.98] cursor-pointer"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            transcripts.map((t) => {
              const isUser = t.speaker === 'user';
              const isCopied = copiedId === t.id;
              const isEditing = editingId === t.id;

              return (
                <div
                  key={t.id}
                  className={`w-full flex ${isUser ? 'justify-end pl-6 sm:pl-10' : 'justify-start pr-6 sm:pr-10'} animate-in fade-in duration-200 group`}
                >
                  <div
                    className={`flex items-start space-x-2.5 ${
                      isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                    } max-w-[92%]`}
                  >
                    {/* Speaker Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-xs ${
                        isUser
                          ? 'bg-emerald-700 border border-emerald-400/40 text-white'
                          : 'bg-[#1E293B] border border-cyan-500/40 text-cyan-300'
                      }`}
                      title={isUser ? 'You' : 'Fima AI'}
                    >
                      {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </div>

                    {/* Chat Bubble, Metadata, and Action Buttons (Copy & Edit Gemini-Style) */}
                    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 flex-1`}>
                      {/* Name & Timestamp Header */}
                      <div className="flex items-center space-x-1.5 mb-1 px-1">
                        {isUser ? (
                          <>
                            <span className="text-[10px] text-white/40">{t.timestamp}</span>
                            <span className="text-xs font-bold text-emerald-400">You</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-bold text-cyan-300">Fima AI</span>
                            <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                              BOT
                            </span>
                            <span className="text-[10px] text-white/40">{t.timestamp}</span>
                          </>
                        )}
                      </div>

                      {/* Chat Bubble OR Inline Edit Mode (Gemini-style) */}
                      {isEditing ? (
                        <div className="w-full min-w-[240px] sm:min-w-[300px] bg-[#141B26] border border-emerald-500/60 rounded-2xl p-3 shadow-xl space-y-2">
                          <textarea
                            ref={editInputRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(t.id);
                              }
                            }}
                            rows={3}
                            className="w-full bg-[#0A0E15] border border-white/10 rounded-xl p-2.5 text-xs sm:text-sm text-white placeholder-white/40 outline-hidden resize-none focus:border-emerald-500/60"
                            placeholder="Edit your prompt..."
                          />
                          <div className="flex items-center justify-end space-x-2 pt-1">
                            <button
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(t.id)}
                              disabled={!editText.trim()}
                              className="px-3 py-1 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors flex items-center space-x-1.5 cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Update &amp; Send</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-md break-words ${
                            isUser
                              ? 'bg-[#005C4B] text-[#E9EDEF] rounded-tr-none border border-emerald-500/30'
                              : 'bg-[#202C33] text-[#E9EDEF] rounded-tl-none border border-[#2A3942]'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{t.text}</p>
                        </div>
                      )}

                      {/* Gemini-Style Action Bar: Copy & Edit directly on each message */}
                      {!isEditing && (
                        <div
                          className={`flex items-center space-x-1 mt-1.5 px-1 ${
                            isUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {/* Copy Button (Prompt or Response) */}
                          <button
                            onClick={() => handleCopyMessage(t.id, t.text)}
                            className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                            title={isUser ? 'Copy prompt' : 'Copy response'}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-medium">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Edit Button (Only for User Prompts - like Gemini) */}
                          {isUser && (
                            <button
                              onClick={() => startEditPrompt(t)}
                              className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[11px] text-white/50 hover:text-emerald-300 hover:bg-white/10 transition-all cursor-pointer"
                              title="Edit prompt"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Bottom Footer: 100% Solid Opaque Background (#141B26) */}
        <div className="p-3 sm:p-3.5 bg-[#141B26] border-t border-white/10 shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs text-white/50 px-1">
            <span>
              {transcripts.length} {transcripts.length === 1 ? 'message' : 'messages'}
            </span>
            {transcripts.length > 3 && (
              <button
                onClick={scrollToBottom}
                className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer text-xs"
              >
                <span>Jump to latest</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Input directly inside sidebar */}
          <div className="flex items-center bg-[#0A0E15] border border-white/15 rounded-xl px-3 py-1.5 focus-within:border-emerald-500/60 transition-colors">
            <input
              type="text"
              value={localInput}
              onChange={(e) => setLocalInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type to Fima..."
              className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-white/40 outline-hidden"
            />
            <button
              onClick={() => handleSend()}
              disabled={!localInput.trim() || status === 'disconnected'}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors cursor-pointer shrink-0 ml-1"
              title="Send message"
            >
              <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
