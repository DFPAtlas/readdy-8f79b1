// Global Assist Panel — desktop resizable panel / mobile full-height sheet
import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { assistService, type AssistConversation, type AssistMessage, type AssistSource } from '@/services/assist.service';

interface AssistPanelProps {
  isOpen: boolean;
  onClose: () => void;
  scopeType?: string;
  scopeId?: string;
  scopeLabel?: string;
  templateKey?: string;
}

export default function AssistPanel({ isOpen, onClose, scopeType, scopeId, scopeLabel, templateKey }: AssistPanelProps) {
  const { user } = useAuth();
  const { organisation } = useOrg();
  const [conversations, setConversations] = useState<AssistConversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AssistMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [showSources, setShowSources] = useState<AssistSource[] | null>(null);
  const [showConvList, setShowConvList] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState<number | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [panelWidth, setPanelWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const orgId = organisation?.id;

  // Load conversations on open
  useEffect(() => {
    if (!isOpen || !orgId) return;
    loadConversations();
    loadSettings();
  }, [isOpen, orgId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Resize handlers
  const handleResizeStart = useCallback(() => {
    setIsResizing(true);
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const w = window.innerWidth - e.clientX;
      setPanelWidth(Math.max(340, Math.min(700, w)));
    };
    const handleUp = () => {
      setIsResizing(false);
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizing]);

  const loadSettings = async () => {
    if (!orgId) return;
    try {
      const data = await assistService.getSettings(orgId);
      setAiEnabled(data.settings?.ai_enabled ?? false);
    } catch { /* ignore */ }
  };

  const loadConversations = async () => {
    if (!orgId) return;
    try {
      const convs = await assistService.listConversations(orgId);
      setConversations(convs);
    } catch { /* ignore */ }
  };

  const loadMessages = async (convId: number) => {
    try {
      const msgs = await assistService.getMessages(convId);
      setMessages(msgs);
    } catch { /* ignore */ }
  };

  const selectConversation = (convId: number) => {
    setActiveConvId(convId);
    setShowConvList(false);
    setShowSources(null);
    loadMessages(convId);
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
    setShowConvList(false);
    setShowSources(null);
    setError(null);
  };

  const handleSend = async () => {
    if (!input.trim() || !orgId || loading) return;
    const msg = input.trim();
    setInput('');
    setLoading(true);
    setError(null);

    // Add optimistic user message
    const userMsg: AssistMessage = {
      id: Date.now(),
      role: 'user',
      content: msg,
      is_ai_assisted: false,
      needs_review: false,
      created_at: new Date().toISOString(),
      cost_pence: 0,
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const resp = await assistService.chat({
        organisationId: orgId,
        conversationId: activeConvId ?? undefined,
        message: msg,
        scopeType,
        scopeId,
        scopeLabel,
        templateKey,
      });

      if (resp.error) {
        setError(resp.error);
        if (resp.code === 'AI_DISABLED') setAiEnabled(false);
        return;
      }

      if (!activeConvId && resp.conversationId) {
        setActiveConvId(resp.conversationId);
        loadConversations();
      }

      const assistantMsg: AssistMessage = {
        id: resp.messageId || Date.now() + 1,
        role: 'assistant',
        content: resp.content,
        sources: resp.sources,
        citations: resp.sources,
        is_ai_assisted: resp.isAiAssisted ?? true,
        needs_review: false,
        created_at: new Date().toISOString(),
        run_id: resp.runId,
        cost_pence: resp.usage?.costPence ?? 0,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFeedbackSubmit = async (messageId: number) => {
    if (!orgId) return;
    await assistService.submitFeedback({
      organisationId: orgId,
      messageId,
      rating: feedbackRating,
      comment: feedbackComment,
      isReportedIncorrect: feedbackRating <= 2,
    });
    setFeedbackOpen(null);
    setFeedbackRating(0);
    setFeedbackComment('');
  };

  if (!isOpen) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-[60]" onClick={onClose} />

      {/* Panel */}
      <div
        className={`fixed z-[61] bg-background-50 flex flex-col shadow-2xl ${
          isMobile
            ? 'inset-x-0 bottom-0 top-16 rounded-t-2xl animate-slide-up'
            : 'top-0 right-0 h-full border-l border-background-200'
        }`}
        style={isMobile ? {} : { width: panelWidth }}
      >
        {/* Resize handle (desktop) */}
        {!isMobile && (
          <div
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary-500/30 transition-colors z-10"
            onMouseDown={handleResizeStart}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-background-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <i className="ri-robot-line text-white text-sm"></i>
            </div>
            <div>
              <h2 className="text-foreground-950 font-semibold text-sm">SiteLedger Assist</h2>
              {scopeLabel && (
                <p className="text-foreground-500 text-[11px] flex items-center gap-1">
                  <i className="ri-focus-3-line text-[10px]"></i>
                  {scopeLabel}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setShowConvList(!showConvList); setShowSources(null); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500 transition-colors"
              title="Conversations"
            >
              <i className="ri-chat-history-line text-base"></i>
            </button>
            <button
              onClick={newConversation}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500 transition-colors"
              title="New conversation"
            >
              <i className="ri-add-line text-base"></i>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500 transition-colors"
            >
              <i className="ri-close-line text-base"></i>
            </button>
          </div>
        </div>

        {/* AI disabled warning */}
        {!aiEnabled && (
          <div className="mx-4 mt-3 p-3 rounded-lg bg-status-amber-pale border border-status-amber/20 flex items-start gap-3 flex-shrink-0">
            <i className="ri-information-line text-status-amber mt-0.5"></i>
            <div>
              <p className="text-sm font-medium text-status-amber">AI not enabled</p>
              <p className="text-xs text-foreground-600 mt-0.5">An organisation admin needs to enable AI in Settings &gt; AI &amp; Automation.</p>
            </div>
          </div>
        )}

        {/* Conversation list overlay */}
        {showConvList && (
          <div className="absolute top-12 left-0 right-0 bottom-0 bg-background-50 z-20 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-background-200">
              <h3 className="text-sm font-semibold text-foreground-950">Conversations</h3>
              <button onClick={() => setShowConvList(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500">
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <button
                onClick={newConversation}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-background-100 transition-colors text-left mb-1"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <i className="ri-add-line text-primary-600"></i>
                </div>
                <span className="text-sm font-medium text-foreground-950">New conversation</span>
              </button>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl hover:bg-background-100 transition-colors text-left ${
                    activeConvId === conv.id ? 'bg-background-100' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className="ri-chat-3-line text-secondary-600"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground-950 truncate">{conv.title}</p>
                    <p className="text-[11px] text-foreground-500 mt-0.5">
                      {conv.scope_label || 'Organisation'} &middot; {conv.message_count} messages
                    </p>
                  </div>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-foreground-500 text-center py-8">No conversations yet</p>
              )}
            </div>
          </div>
        )}

        {/* Source drawer */}
        {showSources && showSources.length > 0 && (
          <div className="mx-4 mb-2 p-3 rounded-xl bg-background-100 border border-background-200 flex-shrink-0 max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-foreground-700 uppercase tracking-wider">Sources</h4>
              <button onClick={() => setShowSources(null)} className="text-foreground-400 hover:text-foreground-600">
                <i className="ri-close-line text-sm"></i>
              </button>
            </div>
            {showSources.map((src) => (
              <div key={src.index} className="flex items-start gap-2 py-1.5 border-b border-background-200 last:border-0">
                <span className="w-5 h-5 rounded-md bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-primary-600">{src.index}</span>
                </span>
                <div>
                  <p className="text-xs font-medium text-foreground-800">{src.label}</p>
                  <p className="text-[10px] text-foreground-500">{src.source_type} &middot; {src.date ? new Date(src.date).toLocaleDateString('en-GB') : 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-primary-100 flex items-center justify-center mb-3">
                <i className="ri-robot-line text-2xl text-primary-500"></i>
              </div>
              <h3 className="text-sm font-semibold text-foreground-800 mb-1">How can I help?</h3>
              <p className="text-xs text-foreground-500 max-w-[260px]">
                Ask me about jobs, documents, tasks, or anything in your SiteLedger workspace.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                {['Summarise today\'s site activity', 'What safety actions are open?', 'Show outstanding variations'].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="px-2.5 py-1.5 rounded-full bg-background-100 hover:bg-background-200 text-xs text-foreground-600 transition-colors whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : 'w-full'}`}>
                {/* Assistant label */}
                {msg.is_ai_assisted && (
                  <div className="flex items-center gap-1.5 mb-1 ml-1">
                    <span className="text-[10px] font-medium text-primary-500 uppercase tracking-wider flex items-center gap-1">
                      <i className="ri-robot-line"></i> AI-assisted
                    </span>
                  </div>
                )}

                <div className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white rounded-br-md'
                    : 'bg-background-100 text-foreground-900 rounded-bl-md'
                }`}>
                  {msg.content}
                </div>

                {/* Sources button */}
                {msg.sources && Array.isArray(msg.sources) && msg.sources.length > 0 && (
                  <button
                    onClick={() => setShowSources(msg.sources as AssistSource[])}
                    className="mt-1.5 ml-1 flex items-center gap-1 text-[11px] text-primary-500 hover:text-primary-600 font-medium"
                  >
                    <i className="ri-links-line"></i>
                    {msg.sources.length} source{msg.sources.length > 1 ? 's' : ''}
                  </button>
                )}

                {/* Feedback */}
                {msg.is_ai_assisted && (
                  <div className="flex items-center gap-1 mt-1 ml-1">
                    <button
                      onClick={() => setFeedbackOpen(feedbackOpen === msg.id ? null : msg.id)}
                      className="text-[10px] text-foreground-400 hover:text-foreground-600 flex items-center gap-0.5"
                    >
                      <i className="ri-feedback-line"></i> Feedback
                    </button>
                    {msg.cost_pence > 0 && (
                      <span className="text-[10px] text-foreground-400 ml-2">~£{(msg.cost_pence / 100).toFixed(3)}</span>
                    )}
                  </div>
                )}

                {/* Feedback form */}
                {feedbackOpen === msg.id && (
                  <div className="mt-2 p-3 rounded-xl bg-background-100 border border-background-200 ml-1">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button
                          key={r}
                          onClick={() => setFeedbackRating(r)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm transition-colors ${
                            feedbackRating >= r ? 'bg-primary-500 text-white' : 'bg-background-200 text-foreground-400'
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="What could be better? (optional)"
                      className="w-full text-xs p-2 rounded-lg border border-background-200 bg-background-50 resize-none h-14 focus:outline-none focus:border-primary-300 mb-2"
                      maxLength={500}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeedbackSubmit(msg.id)}
                        className="px-3 py-1.5 rounded-lg bg-primary-500 text-white text-xs font-medium hover:bg-primary-600 transition-colors whitespace-nowrap"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => setFeedbackOpen(null)}
                        className="px-3 py-1.5 rounded-lg bg-background-200 text-foreground-600 text-xs font-medium hover:bg-background-300 transition-colors whitespace-nowrap"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-background-100 rounded-2xl rounded-bl-md p-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-status-red-pale border border-status-red/20 text-sm text-status-red">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-background-200 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={aiEnabled ? "Ask SiteLedger Assist..." : "AI is not enabled for your organisation"}
              disabled={!aiEnabled}
              className="flex-1 resize-none rounded-xl border border-background-200 bg-background-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary-300 min-h-[44px] max-h-28 disabled:opacity-50 disabled:cursor-not-allowed"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || !aiEnabled}
              className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
            >
              {loading ? (
                <i className="ri-loader-4-line animate-spin"></i>
              ) : (
                <i className="ri-send-plane-fill"></i>
              )}
            </button>
          </div>
          <p className="text-[10px] text-foreground-400 mt-1.5 text-center">
            SiteLedger Assist is AI-assisted. A competent person must review safety decisions.
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.25s ease-out; }
      `}</style>
    </>
  );
}