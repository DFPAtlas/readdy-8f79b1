import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getAllConversations,
  getTotalUnreadMessages,
  getConversationTypeIcon,
  getConversationTypeLabel,
  getConversationVisibilityLabel,
  formatFileSize,
  formatTimestamp,
  formatMessageTime,
  formatMessageDate,
  inboxFilters,
} from '@/mocks/communications';
import type { ConversationRecord, MessageRecord } from '@/mocks/communications';

export default function MessagesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState<ConversationRecord[]>(getAllConversations());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(conversations[0]?.id || null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const totalUnread = getTotalUnreadMessages();

  const filteredConversations = (() => {
    let result = conversations;
    if (activeFilter === 'unread') result = result.filter((c) => c.unreadCount > 0);
    else if (activeFilter === 'starred') result = result.filter((c) => c.starred);
    else if (activeFilter === 'internal') result = result.filter((c) => c.type === 'internal_job' || c.type === 'direct_internal');
    else if (activeFilter === 'client') result = result.filter((c) => c.type === 'client');
    else if (activeFilter === 'subcontractor') result = result.filter((c) => c.type === 'subcontractor');
    else if (activeFilter === 'archived') result = result.filter((c) => c.archivedAt);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.jobName?.toLowerCase().includes(q) ||
          c.clientName?.toLowerCase().includes(q) ||
          c.workforceBusinessName?.toLowerCase().includes(q) ||
          c.lastMessagePreview?.toLowerCase().includes(q),
      );
    }
    return result;
  })();

  const handleStar = (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, starred: !c.starred } : c)),
    );
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;

    const newMsg: MessageRecord = {
      id: `msg-new-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: 'user-martin',
      senderName: 'Martin Hewett',
      senderType: 'user',
      body: newMessage.trim(),
      clientVisible: activeConversation.type === 'client' || activeConversation.type === 'commercial',
      createdAt: new Date().toISOString(),
      attachments: [],
      mentions: [],
      deliveryState: 'sent',
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              messages: [...c.messages, newMsg],
              lastMessageAt: newMsg.createdAt,
              lastMessagePreview: newMsg.body.slice(0, 80),
              lastMessageSender: 'Martin Hewett',
              updatedAt: newMsg.createdAt,
            }
          : c,
      ),
    );
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const groupedMessages = activeConversation
    ? activeConversation.messages.reduce(
        (groups: { date: string; messages: MessageRecord[] }[], msg) => {
          const dateLabel = formatMessageDate(msg.createdAt);
          const last = groups[groups.length - 1];
          if (last && last.date === dateLabel) {
            last.messages.push(msg);
          } else {
            groups.push({ date: dateLabel, messages: [msg] });
          }
          return groups;
        },
        [],
      )
    : [];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* LEFT — Conversation list */}
      <div className="w-full lg:w-[340px] flex-shrink-0 border-r border-background-200 bg-white flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-background-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-foreground-950">{t('messages.heading')}</h1>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-background-100 text-foreground-500 transition-colors cursor-pointer"
              onClick={() => {}}
            >
              <i className="ri-edit-line text-lg"></i>
            </button>
          </div>
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400 text-sm"></i>
            <input
              type="text"
              placeholder={t('messages.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-background-50 rounded-xl text-sm text-foreground-950 placeholder:text-foreground-400 border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="px-3 py-2 flex items-center gap-1 overflow-x-auto scrollbar-hide border-b border-background-100">
          {inboxFilters.slice(0, 5).map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer
                  ${isActive ? 'bg-foreground-950 text-background-50' : 'text-foreground-500 hover:bg-background-100'}
                `}
              >
                <i className={`${filter.icon} text-[11px]`}></i>
                {filter.label}
                {filter.id === 'unread' && totalUnread > 0 && (
                  <span className={`text-[10px] px-1 rounded-full ${isActive ? 'bg-background-50/20' : 'bg-foreground-100'}`}>
                    {totalUnread}
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setActiveFilter('archived')}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer
              ${activeFilter === 'archived' ? 'bg-foreground-950 text-background-50' : 'text-foreground-500 hover:bg-background-100'}
            `}
          >
            <i className="ri-archive-line text-[11px]"></i>
            Archived
          </button>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-background-100 flex items-center justify-center">
                <i className="ri-chat-1-line text-xl text-foreground-400"></i>
              </div>
              <p className="text-sm font-semibold text-foreground-950">{t('messages.noConversations')}</p>
              <p className="text-xs text-foreground-500 mt-1">{t('messages.noConversationsDesc')}</p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isClientType = conv.type === 'client';

              return (
                <button
                  key={conv.id}
                  onClick={() => {
                    setActiveConversationId(conv.id);
                    setShowInfoPanel(false);
                  }}
                  className={`
                    w-full text-left px-4 py-3 border-b border-background-50 transition-colors cursor-pointer
                    ${isActive ? 'bg-background-100' : 'hover:bg-background-50'}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`
                      w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      ${isClientType ? 'bg-status-green/10 text-status-green' : conv.type === 'internal_job' || conv.type === 'direct_internal' ? 'bg-status-blue/10 text-status-blue' : conv.type === 'subcontractor' ? 'bg-status-purple/10 text-status-purple' : 'bg-status-amber/10 text-status-amber'}
                    `}>
                      <i className={`${getConversationTypeIcon(conv.type)} text-lg`}></i>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-foreground-950' : 'font-medium text-foreground-800'}`}>
                          {conv.title}
                        </p>
                        <span className="text-[11px] text-foreground-400 whitespace-nowrap">
                          {conv.lastMessageAt ? formatTimestamp(conv.lastMessageAt) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {conv.jobRef && (
                          <span className="text-[10px] text-foreground-400 bg-background-100 px-1.5 py-0.5 rounded">
                            {conv.jobRef}
                          </span>
                        )}
                        <span className="text-[10px] text-foreground-400 uppercase">
                          {getConversationTypeLabel(conv.type)}
                        </span>
                      </div>
                      <p className="text-xs text-foreground-500 mt-1 truncate">
                        {conv.lastMessageSender && (
                          <span className="font-medium text-foreground-600">{conv.lastMessageSender}: </span>
                        )}
                        {conv.lastMessagePreview || 'No messages yet'}
                      </p>
                    </div>

                    <div className="flex flex-col items-center gap-2 flex-shrink-0">
                      {conv.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-primary-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleStar(conv.id, e)}
                        className={`${conv.starred ? 'text-status-amber' : 'text-foreground-300'} hover:text-status-amber transition-colors cursor-pointer`}
                      >
                        <i className={`${conv.starred ? 'ri-star-fill' : 'ri-star-line'} text-sm`}></i>
                      </button>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CENTRE — Message thread */}
      <div className="hidden lg:flex flex-col flex-1 min-w-0 bg-background-50">
        {!activeConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-background-100 flex items-center justify-center">
                <i className="ri-chat-1-line text-3xl text-foreground-300"></i>
              </div>
              <p className="text-foreground-950 font-semibold">{t('messages.heading')}</p>
              <p className="text-sm text-foreground-500 mt-1 max-w-xs mx-auto">{t('messages.subheading')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header */}
            <div className="h-16 flex items-center justify-between px-5 bg-white border-b border-background-100 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`
                  w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                  ${activeConversation.type === 'client' ? 'bg-status-green/10 text-status-green' : activeConversation.type === 'internal_job' || activeConversation.type === 'direct_internal' ? 'bg-status-blue/10 text-status-blue' : activeConversation.type === 'subcontractor' ? 'bg-status-purple/10 text-status-purple' : 'bg-status-amber/10 text-status-amber'}
                `}>
                  <i className={`${getConversationTypeIcon(activeConversation.type)} text-base`}></i>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground-950 truncate">{activeConversation.title}</p>
                  <div className="flex items-center gap-2">
                    {activeConversation.jobRef && (
                      <span className="text-[11px] text-foreground-400">{activeConversation.jobRef}</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-background-100 text-foreground-500">
                      {getConversationVisibilityLabel(activeConversation.type)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowInfoPanel(!showInfoPanel)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${showInfoPanel ? 'bg-background-200 text-foreground-800' : 'text-foreground-400 hover:bg-background-100'}`}
                >
                  <i className="ri-information-line text-lg"></i>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {groupedMessages.map((group) => (
                <div key={group.date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-background-200"></div>
                    <span className="text-xs text-foreground-400 font-medium">{group.date}</span>
                    <div className="flex-1 h-px bg-background-200"></div>
                  </div>
                  {group.messages.map((msg) => {
                    const isOwn = msg.senderType === 'user';
                    const isSystem = msg.senderType === 'system';

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="flex justify-center mb-4">
                          <span className="text-xs text-foreground-400 bg-background-100 px-3 py-1 rounded-full">
                            {msg.body}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} className={`flex gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-primary-500' : 'bg-background-200'}`}>
                          <span className={`text-xs font-semibold ${isOwn ? 'text-white' : 'text-foreground-600'}`}>
                            {msg.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </span>
                        </div>
                        <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground-600">{msg.senderName}</span>
                            <span className="text-[10px] text-foreground-400">{formatMessageTime(msg.createdAt)}</span>
                            {!msg.clientVisible && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-status-amber/10 text-status-amber font-medium">Internal</span>
                            )}
                          </div>
                          <div className={`
                            rounded-2xl px-4 py-2.5 text-sm
                            ${isOwn ? 'bg-primary-500 text-white rounded-tr-md' : 'bg-white text-foreground-900 rounded-tl-md border border-background-100'}
                          `}>
                            <p className="whitespace-pre-wrap">{msg.body}</p>
                          </div>
                          {msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att) => (
                                <div key={att.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-background-100 text-xs ${isOwn ? 'justify-end' : ''}`}>
                                  <i className={`${att.contentType.includes('pdf') ? 'ri-file-pdf-line text-status-red' : 'ri-image-line text-status-blue'} text-sm`}></i>
                                  <span className="text-foreground-700">{att.fileName}</span>
                                  <span className="text-foreground-400">{formatFileSize(att.fileSize)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            {msg.deliveryState === 'read' && (
                              <span className="text-[10px] text-foreground-400">Read</span>
                            )}
                            {msg.withdrawnAt && (
                              <span className="text-[10px] text-status-red italic">{t('messages.withdrawn')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="px-5 py-3 bg-white border-t border-background-100 flex-shrink-0">
              {activeConversation.type === 'client' && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <i className="ri-information-line text-status-amber text-sm"></i>
                  <span className="text-xs text-status-amber font-medium">{t('messages.clientVisibleWarning')}</span>
                </div>
              )}
              <div className="flex items-end gap-2">
                <button className="w-9 h-9 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 transition-colors cursor-pointer flex-shrink-0">
                  <i className="ri-attachment-2 text-lg"></i>
                </button>
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('messages.typeMessage')}
                    rows={1}
                    className="w-full resize-none bg-background-50 rounded-xl px-4 py-2.5 text-sm text-foreground-950 placeholder:text-foreground-400 border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0"
                >
                  <i className="ri-send-plane-fill text-base"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT — Info panel (desktop only) */}
      {showInfoPanel && activeConversation && (
        <div className="hidden xl:block w-[280px] flex-shrink-0 border-l border-background-200 bg-white overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground-950">{t('messages.jobDetails')}</h3>
              <button
                onClick={() => setShowInfoPanel(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-foreground-400 hover:bg-background-100 transition-colors cursor-pointer"
              >
                <i className="ri-close-line"></i>
              </button>
            </div>

            {/* Participants */}
            <div className="mb-5">
              <p className="text-[11px] text-foreground-400 uppercase tracking-wider font-medium mb-2">{t('messages.participants')}</p>
              <div className="space-y-2">
                {activeConversation.participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${p.participantType === 'user' ? 'bg-primary-100 text-primary-700' : p.participantType === 'client' ? 'bg-status-green/10 text-status-green' : p.participantType === 'subcontractor' ? 'bg-status-purple/10 text-status-purple' : 'bg-background-100 text-foreground-500'}`}>
                      <span className="text-[10px] font-semibold">{p.avatarInitials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-foreground-400 capitalize">{p.participantType}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Job info */}
            {activeConversation.jobId && (
              <div className="mb-5">
                <p className="text-[11px] text-foreground-400 uppercase tracking-wider font-medium mb-2">{t('messages.jobDetails')}</p>
                <div className="bg-background-50 rounded-xl p-3 space-y-2">
                  <div>
                    <p className="text-[10px] text-foreground-400">Job</p>
                    <p className="text-xs font-medium text-foreground-900">{activeConversation.jobName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-foreground-400">Reference</p>
                    <p className="text-xs text-foreground-700">{activeConversation.jobRef}</p>
                  </div>
                  {activeConversation.variationRef && (
                    <div>
                      <p className="text-[10px] text-foreground-400">Variation</p>
                      <button
                        onClick={() => navigate(`/variations/${activeConversation.variationId}`)}
                        className="text-xs text-primary-500 hover:underline cursor-pointer"
                      >
                        {activeConversation.variationRef}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Shared files */}
            <div className="mb-5">
              <p className="text-[11px] text-foreground-400 uppercase tracking-wider font-medium mb-2">{t('messages.sharedFiles')}</p>
              {activeConversation.messages.some((m) => m.attachments.length > 0) ? (
                <div className="space-y-1">
                  {activeConversation.messages
                    .filter((m) => m.attachments.length > 0)
                    .flatMap((m) => m.attachments)
                    .slice(0, 5)
                    .map((att, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1.5 hover:bg-background-50 rounded-lg cursor-pointer">
                        <i className={`${att.contentType.includes('pdf') ? 'ri-file-pdf-line text-status-red' : 'ri-image-line text-status-blue'} text-sm`}></i>
                        <div className="min-w-0">
                          <p className="text-xs text-foreground-700 truncate">{att.fileName}</p>
                          <p className="text-[10px] text-foreground-400">{formatFileSize(att.fileSize)}</p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-foreground-400">{t('messages.noFiles')}</p>
              )}
            </div>

            {/* Visibility */}
            <div>
              <p className="text-[11px] text-foreground-400 uppercase tracking-wider font-medium mb-2">{t('messages.visibilityLabel')}</p>
              <span className="text-xs px-2 py-1 rounded-md bg-background-100 text-foreground-600">
                {getConversationVisibilityLabel(activeConversation.type)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile fallback (shown below lg) */}
      <div className="lg:hidden flex-1 flex items-center justify-center bg-background-50 p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-background-100 flex items-center justify-center">
            <i className="ri-smartphone-line text-2xl text-foreground-400"></i>
          </div>
          <p className="text-sm font-semibold text-foreground-950">Messages</p>
          <p className="text-xs text-foreground-500 mt-1 max-w-xs mx-auto">Select a conversation from the list to view messages. Full mobile support coming in the next update.</p>
          {activeConversation && (
            <div className="mt-4 bg-white rounded-xl p-4 border border-background-200 max-w-sm mx-auto text-left">
              <p className="text-sm font-semibold text-foreground-950">{activeConversation.title}</p>
              <p className="text-xs text-foreground-500 mt-1">
                {activeConversation.messages.length} messages • Last: {activeConversation.lastMessageAt ? formatTimestamp(activeConversation.lastMessageAt) : '—'}
              </p>
              <div className="mt-3 border-t border-background-100 pt-3 space-y-2 max-h-[300px] overflow-y-auto">
                {activeConversation.messages.slice(-3).map((msg) => (
                  <div key={msg.id} className={`text-xs ${msg.senderType === 'user' ? 'text-primary-600' : 'text-foreground-700'}`}>
                    <span className="font-medium">{msg.senderName}: </span>
                    {msg.body.slice(0, 100)}{msg.body.length > 100 ? '…' : ''}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}