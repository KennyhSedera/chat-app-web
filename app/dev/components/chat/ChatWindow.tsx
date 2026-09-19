'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import chatService from '../../services/chatService';
import uploadService from '../../services/uploadService';
import { Message } from '../../types/chat.types';
import { useChat } from '../../contexts/ChatContext';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MdCopyAll, MdDelete, MdReply, } from 'react-icons/md';
import { IoIosShareAlt } from 'react-icons/io';
import { FiEdit } from "react-icons/fi";
import { GoTrash } from 'react-icons/go';
import { BiChevronLeft } from 'react-icons/bi';
import EmojieModal from '../EmojieModal';

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

export function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDaySeparator(date: string | Date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(d, today)) return "Aujourd'hui";
  if (isSameDay(d, yesterday)) return 'Hier';

  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function formatRelativeTime(date?: string | Date | null) {
  if (!date) return '';
  const diffMs = Date.now() - new Date(date).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'hier';
  if (d < 7) return `il y a ${d} j`;
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export type Grouped = {
  type: 'separator' | 'message';
  date?: string;
  message?: Message;
  senderId?: string;
  isFirstOfGroup?: boolean;
  isLastOfGroup?: boolean;
};

export const renderBubble = (message: Message, isMine: boolean, setLightboxUrl: (url: string | null) => void, setVideoModalUrl: (url: string | null) => void) => {
  const bubbleBase = `w-fit px-3.5 py-2.5 text-[14px] leading-relaxed ${isMine ? 'bg-[#3ECF8E] text-[#04342C]' : 'bg-[#1B1F27] text-[#F5F6F7]'
    }`;

  switch (message.contentType) {
    case 'text':
      return (
        <div className={`${bubbleBase} rounded-2xl`}>
          <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
        </div>
      );

    case 'image':
      return (
        <button
          onClick={() => setLightboxUrl(message.fileUrl || null)}
          className="w-fit overflow-hidden rounded-2xl bg-[#1B1F27] text-left"
        >
          <div className="relative h-64 w-64">
            <Image
              src={message.fileUrl || ''}
              alt="Image envoyée"
              fill
              className="object-cover"
            />
          </div>
        </button>
      );

    case 'audio':
      return (
        <div className={`${bubbleBase} min-w-55 rounded-2xl`}>
          <audio controls src={message.fileUrl || ''} className="h-9 w-full" />
        </div>
      );

    case 'video':
      return (
        <button
          onClick={() => setVideoModalUrl(message.fileUrl || null)}
          className="relative w-fit overflow-hidden rounded-2xl bg-[#1B1F27]"
        >
          <div className="relative h-56 w-64">
            <Image
              src={message.thumbnailUrl || message.fileUrl || ''}
              alt="Vidéo"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </button>
      );

    case 'document':
      return (
        <a
          href={message.fileUrl || ''}
          target="_blank"
          rel="noreferrer"
          className={`${bubbleBase} flex items-center gap-3 rounded-2xl`}
        >
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isMine ? 'bg-[#04342C1A]' : 'bg-[#0A0C10]'
              }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{message.fileName ?? 'Document'}</p>
            {!!message.fileSize && (
              <p className={`text-[12px] ${isMine ? 'text-[#04342C99]' : 'text-[#8B92A0]'}`}>
                {formatFileSize(message.fileSize)}
              </p>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
          </svg>
        </a>
      );

    default:
      return null;
  }
};

export function groupMessages(messages: Message[]): Grouped[] {
  const result: Grouped[] = [];
  let lastDay: string | null = null;
  let lastSenderId: string | null = null;

  messages.forEach((message, i) => {
    const day = new Date(message.createdAt).toDateString();
    if (day !== lastDay) {
      result.push({ type: 'separator', date: message.createdAt as unknown as string });
      lastDay = day;
      lastSenderId = null;
    }

    const senderId = message.user._id;
    const prev = messages[i - 1];
    const isFirstOfGroup =
      senderId !== lastSenderId ||
      !prev ||
      new Date(prev.createdAt).toDateString() !== day;

    const next = messages[i + 1];
    const isLastOfGroup =
      !next ||
      next.user._id !== senderId ||
      new Date(next.createdAt).toDateString() !== day;

    result.push({ type: 'message', message, senderId, isFirstOfGroup, isLastOfGroup });
    lastSenderId = senderId;
  });

  return result;
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────
type ChatWindowProps = {
  chatId: string;
  onBack: () => void;
};

export function ChatWindow({ chatId, onBack }: ChatWindowProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { chats, markChatAsRead, updateChatWithNewMessage,
    setActiveChatId } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!menuMessageId || !menuRef.current) return;

    const menuRect = menuRef.current.getBoundingClientRect();
    const container = menuRef.current.closest('.scrollbar-theme');
    const containerRect = container?.getBoundingClientRect();

    if (containerRect && menuRect.bottom > containerRect.bottom) {
      setMenuPosition('top');
    }
  }, [menuMessageId]);

  const chat = chats.find((c) => c.chatId === chatId);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const fetchMessages = useCallback(() => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    chatService.joinPrivateChat(chatId, user);
    markChatAsRead(chatId);
  }, [chatId, user, markChatAsRead]);

  useEffect(() => {
    if (!user?._id) return;

    setActiveChatId(chatId);
    let isMounted = true;
    setLoading(true);
    setError(null);
    setMessages([]);

    const handlePrevious = (previous: Message[]) => {
      if (!isMounted) return;
      setMessages(
        [...previous].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
      );
      setLoading(false);
      requestAnimationFrame(() => scrollToBottom('auto'));
    };

    const handleNew = (message: Message) => {
      if (!isMounted || message.chatId !== chatId) return;
      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });
      updateChatWithNewMessage(message, user._id);

      if (message.user._id !== user._id) {
        markChatAsRead(chatId);
      }
    };

    const handleTyping = (data: {
      chatId: string;
      user: { _id: string };
      isTyping: boolean;
    }) => {
      if (!isMounted || data.chatId !== chatId || data.user._id === user._id) {
        return;
      }

      setOtherUserTyping(data.isTyping);
    };

    const handleEdited = (data: { _id: string; content: string; isEdited: boolean; updatedAt: string }) => {
      if (!isMounted) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === data._id) {
            return { ...m, content: data.content, isEdited: data.isEdited, updatedAt: data.updatedAt };
          }
          if (m.replyTo?._id === data._id) {
            return { ...m, replyTo: { ...m.replyTo, content: data.content } };
          }
          return m;
        })
      );
    };

    const handleReactionAdded = (data: { messageId: string; userId: string; emoji: string }) => {
      if (!isMounted) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== data.messageId) return m;
          const withoutUser = (m.reactions ?? []).filter((r) => r.userId !== data.userId);
          return { ...m, reactions: [...withoutUser, { emoji: data.emoji, userId: data.userId }] };
        })
      );
    };

    const handleReactionRemoved = (data: { messageId: string; userId: string }) => {
      if (!isMounted) return;
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== data.messageId) return m;
          return { ...m, reactions: (m.reactions ?? []).filter((r) => r.userId !== data.userId) };
        })
      );
    };

    const handleMessagesRead = (data: { chatId: string; readByUserId: string }) => {
      if (!isMounted || data.chatId !== chatId || data.readByUserId === user?._id) return;
      setMessages((prev) =>
        prev.map((m) => (m.user._id === user?._id ? { ...m, isRead: true } : m))
      );
    };

    const handleDeleted = (data: { _id: string }) => {
      if (!isMounted) return;

      setMessages((prev) =>
        prev.filter((m) => m._id !== data._id)
      );
    };

    const unsubMessagesRead = chatService.on('messagesRead', handleMessagesRead);
    const unsubDeleted = chatService.on('messageDeleted', handleDeleted);
    const unsubEdited = chatService.on('messageEdited', handleEdited);
    const unsubReactionAdded = chatService.on('reactionAdded', handleReactionAdded);
    const unsubReactionRemoved = chatService.on('reactionRemoved', handleReactionRemoved);

    const unsubPrevious = chatService.on('previousPrivateMessages', handlePrevious);
    const unsubNew = chatService.on('newPrivateMessage', handleNew);
    const unsubTyping = chatService.on('userPrivateTyping', handleTyping);

    try {
      chatService.joinPrivateChat(chatId, user);
      markChatAsRead(chatId);
    } catch (e) {
      console.error('❌ Erreur de connexion au chat:', e);
      setError('Impossible de se connecter au chat');
      setLoading(false);
    }

    return () => {
      isMounted = false;
      setActiveChatId(null);
      unsubPrevious();
      unsubNew();
      unsubTyping();
      unsubEdited();
      unsubReactionAdded();
      unsubMessagesRead();
      unsubDeleted();
      unsubReactionRemoved();
      chatService.leavePrivateChat(chatId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [chatId, user, markChatAsRead, updateChatWithNewMessage, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const closeMenu = () => setMenuMessageId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || !user) return;

    if (editingMessageId) {
      const messageId = editingMessageId;
      setContent('');
      setEditingMessageId(null);
      try {
        await chatService.editMessage(messageId, user._id, trimmed);
      } catch (error) {
        console.error('❌ Erreur modification message:', error);
      }
      return;
    }

    const replyToMessageId = replyingTo?._id;
    setContent('');
    setReplyingTo(null);
    setIsTyping(false);
    chatService.sendTyping(false, chatId);

    try {
      await chatService.sendPrivateMessage(trimmed, chatId, user, { replyToMessageId });
      inputRef.current?.blur();
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      setContent(trimmed);
    }
  };

  const handleInputFocus = () => {
    setIsTyping(true);
    chatService.sendTyping(true, chatId);
  };

  const handleInputBlur = () => {
    setIsTyping(false);
    chatService.sendTyping(false, chatId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleInputChange = (text: string) => {
    setContent(text);

    if (!isTyping) {
      setIsTyping(true);
      chatService.sendTyping(true, chatId);
    }
  };

  const cancelComposerAction = () => {
    setReplyingTo(null);
    setEditingMessageId(null);
    setContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    const socket = (chatService as any).socket as { emit?: (event: string, payload: unknown) => void } | null;
    if (!socket?.emit) return;

    setUploading(true);
    try {
      const uploaded = await uploadService.uploadFile(file, 'image');
      socket.emit('sendPrivateMessage', {
        chatId,
        user,
        content: uploaded.fileName,
        contentType: 'image',
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize,
        fileMimeType: uploaded.fileMimeType,
      });
    } catch (error) {
      console.error('❌ Erreur envoi image:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (message: Message) => {
    setEditingMessageId(message._id);
    setReplyingTo(null);
    setContent(message.content || '');
    setMenuMessageId(null);
    inputRef.current?.focus();
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    setEditingMessageId(null);
    setMenuMessageId(null);
    inputRef.current?.focus();
  };

  const handleCopy = (message: Message) => {
    navigator.clipboard.writeText(message.content || '');
    setMenuMessageId(null);
  };

  const handleDelete = async (message: Message) => {
    setMenuMessageId(null);
    try {
      await chatService.deleteMessage(message._id, user!._id);
    } catch (error) {
      console.error('❌ Erreur suppression message:', error);
    }
  };

  const grouped = useMemo(() => groupMessages(messages), [messages]);

  if (!chat) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0A0C10] text-sm text-[#8B92A0]">
        Conversation introuvable
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#0A0C10] px-6 text-center">
        <p className="text-sm text-[#E24B4A]">{error}</p>
        <button
          onClick={fetchMessages}
          className="rounded-full bg-[#3ECF8E] px-5 py-2.5 text-sm font-medium text-[#04342C]"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#0A0C10]">
      {/* En-tête */}
      <div className="flex items-center gap-3 border-b border-[#1F242C] px-4 py-3.5">
        <button
          onClick={() => router.back()}
          className="mr-2 rounded-md p-2 hover:bg-[#1F242C] hidden md:block"
        >
          <BiChevronLeft size={30} className="text-[#8B92A0]" />
        </button>
        <button
          onClick={onBack}
          className="mr-2 rounded-md p-2 hover:bg-[#1F242C] md:hidden"
        >
          <BiChevronLeft size={30} className="text-[#8B92A0]" />
        </button>
        <div className="relative h-10 w-10 shrink-0">
          {chat.otherUser.avatar ? (
            <Image
              src={chat.otherUser.avatar}
              alt={chat.otherUser.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border-2 border-[#3ECF8E] object-cover"
            />
          ) : (
            <div
              className="flex h-12 w-12 items-center border border-[#8B92A0] justify-center rounded-full text-[12px] font-semibold text-[#04342C]"
              style={{ backgroundColor: '#3ECF8E', fontFamily: 'var(--font-space-grotesk, sans-serif)' }}
            >{initials(chat.otherUser.name)}
            </div>
          )}
          {chat.otherUser.is_online && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3ECF8E] opacity-60" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#0A0C10] bg-[#3ECF8E]" />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-[15px] font-medium capitalize text-[#F5F6F7]"
            style={{ fontFamily: 'var(--font-space-grotesk, sans-serif)' }}
          >
            {chat.otherUser.name}
          </p>
          <p className={`text-[12px] ${otherUserTyping ? 'text-[#3ECF8E]' : 'text-[#8B92A0]'}`}>
            {otherUserTyping
              ? "en train d'écrire..."
              : chat.otherUser.is_online
                ? 'En ligne'
                : `En ligne ${formatRelativeTime(chat.otherUser.last_seen)}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="scrollbar-theme flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8B92A0]">
            Chargement des messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm text-[#F5F6F7]">Aucun message pour l&apos;instant</p>
            <p className="text-[13px] text-[#8B92A0]">Dites bonjour à {chat.otherUser.name} 👋</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {grouped.map((item, i) => {
              if (item.type === 'separator') {
                return (
                  <div key={`sep-${i}`} className="my-4 flex items-center justify-center">
                    <span
                      className="rounded-full bg-[#12151B] px-3 py-1 text-[11px] font-medium capitalize text-[#8B92A0]"
                      style={{ fontFamily: 'var(--font-mono, monospace)' }}
                    >
                      {formatDaySeparator(item.date!)}
                    </span>
                  </div>
                );
              }

              const message = item.message!;
              const isMine = message.user._id === user?._id;
              const time = formatTime(message.createdAt);
              const menuOpen = menuMessageId === message._id;
              const currentUserId = user?._id;

              const lastMyMessageIndex = grouped.reduce(
                (lastIndex, item, index) =>
                  item.type !== "separator" && item.senderId === currentUserId
                    ? index
                    : lastIndex,
                -1
              );

              return (
                <div
                  key={message._id}
                  className={`group relative flex items-end gap-2 ${isMine ? 'flex-row-reverse' : ''} ${item.isFirstOfGroup ? 'mt-2.5' : ''
                    }`}
                >
                  <div className="flex w-7 shrink-0 justify-center">
                    {!isMine && item.isLastOfGroup && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B1F27] border border-[#a5a5a5] text-[10px] font-semibold text-[#8B92A0]">
                        {message.user.avatar ? <Image src={message.user.avatar} alt={message.user.name} width={24} height={24} className="h-6 w-6 rounded-full object-cover" /> : initials(message.user.name)}
                      </div>
                    )}
                  </div>

                  <div className={`flex max-w-[70%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {message.replyTo && (
                      <div
                        className={`mb-1 flex max-w-[70%] items-center gap-2 overflow-hidden rounded-lg border-l-2 border-[#3ECF8E] bg-[#12151B] px-2.5 py-1.5`}
                      >
                        {message.replyTo.contentType === 'image' && (
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded">
                            <Image
                              src={message.replyTo.fileUrl || ''}
                              alt="Aperçu"
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        {message.replyTo.contentType === 'video' && (
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-[#0A0C10]">
                            <Image
                              src={message.replyTo.thumbnailUrl || message.replyTo.fileUrl || ''}
                              alt="Aperçu vidéo"
                              fill
                              className="object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        )}
                        <p className="truncate text-[12px] text-[#8B92A0]">
                          {message.replyTo.contentType === 'text'
                            ? message.replyTo.content || 'Message'
                            : {
                              image: '📷 Photo',
                              audio: '🎤 Message vocal',
                              video: '🎥 Vidéo',
                              document: `📄 ${message.replyTo.fileName || 'Document'}`,
                            }[message.replyTo.contentType] || message.replyTo.content}
                        </p>
                      </div>
                    )}
                    {renderBubble(message, isMine, setLightboxUrl, setVideoModalUrl)}
                    {(message.reactions?.length ?? 0) > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Object.entries(
                          (message.reactions ?? []).reduce<Record<string, number>>((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
                            return acc;
                          }, {})
                        ).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              if (!user) return;
                              chatService.toggleReaction(message._id, user._id, emoji);
                            }}
                            className="flex items-center gap-1 rounded-full bg-[#1B1F27] px-2 py-0.5 text-[12px]"
                          >
                            <span>{emoji}</span>
                            {count > 1 && <span className="text-[#8B92A0]">{count}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    {item.isLastOfGroup && (
                      <span
                        className="mt-1 flex items-center gap-1 px-1 text-[10px] text-[#5B6270]"
                        style={{ fontFamily: 'var(--font-mono, monospace)' }}
                      >
                        {time}
                        {isMine && (
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={message.isRead ? '#3ECF8E' : '#5B6270'}
                            strokeWidth="2.4"
                          >
                            {i === lastMyMessageIndex && (
                              message.isRead ? (
                                <path d="m1 12 5 5L17 6M8 12l5 5L24 6" />
                              ) : (
                                <path d="m4 12 5 5L20 6" />
                              )
                            )}
                          </svg>
                        )}
                      </span>
                    )}
                  </div>

                  {/* Bouton d'actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const button = e.currentTarget;
                      const rect = button.getBoundingClientRect();
                      const container = button.closest('.scrollbar-theme');
                      const containerRect = container?.getBoundingClientRect();

                      if (containerRect) {
                        const spaceBelow = containerRect.bottom - rect.bottom;
                        const MENU_HEIGHT_ESTIMATE = 280;
                        setMenuPosition(spaceBelow < MENU_HEIGHT_ESTIMATE ? 'top' : 'bottom');
                      }

                      setMenuMessageId(menuOpen ? null : message._id);
                    }}
                    className={`self-center rounded-full p-1 text-[#5B6270] opacity-0 transition-opacity hover:bg-[#1B1F27] group-hover:opacity-100 ${menuOpen ? 'opacity-100' : ''
                      }`}
                    aria-label="Actions du message"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="5" cy="12" r="1.8" />
                      <circle cx="12" cy="12" r="1.8" />
                      <circle cx="19" cy="12" r="1.8" />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div
                      ref={menuRef}
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute z-10 w-40 overflow-hidden rounded-xl border border-[#232830] bg-[#12151B] py-1 shadow-xl ${isMine ? 'right-8' : 'left-8'
                        } ${menuPosition === 'top' ? 'bottom-6' : 'top-6'
                        }`}
                    >
                      <div className="flex justify-around border-b border-[#232830] px-2 py-2">
                        {['👍', '❤️', '😆', '😮', '😢'].map((emoji) => {
                          const isMine = message.reactions?.some((r) => r.userId === user?._id && r.emoji === emoji);
                          return (
                            <button
                              key={emoji}
                              onClick={() => {
                                if (!user) return;
                                chatService.toggleReaction(message._id, user._id, emoji);
                                setMenuMessageId(null);
                              }}
                              className={`text-lg transition-transform hover:scale-125 ${isMine ? 'scale-125' : ''}`}
                            >
                              {emoji}
                            </button>
                          );
                        })}
                      </div>
                      {message.contentType === 'text' && (
                        <button
                          onClick={() => handleCopy(message)}
                          className="block w-full px-3.5 py-2 text-left text-[13px] text-[#F5F6F7] hover:bg-[#1B1F27]"
                        >
                          <MdCopyAll className="mr-2 inline-block" /> Copier
                        </button>
                      )}
                      <button
                        onClick={() => handleReply(message)}
                        className="block w-full px-3.5 py-2 text-left text-[13px] text-[#F5F6F7] hover:bg-[#1B1F27]"
                      >
                        <MdReply className="mr-2 inline-block" /> Répondre
                      </button>
                      <button
                        onClick={() => setMenuMessageId(null)}
                        className="block w-full px-3.5 py-2 text-left text-[13px] text-[#F5F6F7] hover:bg-[#1B1F27]"
                      >
                        <IoIosShareAlt className="mr-2 inline-block" /> Transférer
                      </button>
                      {isMine && message.contentType === 'text' && (
                        <button
                          onClick={() => handleEdit(message)}
                          className="block w-full px-3.5 py-2 text-left text-[13px] text-[#F5F6F7] hover:bg-[#1B1F27]"
                        >
                          <FiEdit className="mr-2 inline-block" /> Modifier
                        </button>
                      )}
                      {isMine && (
                        <button
                          onClick={() => handleDelete(message)}
                          className="block w-full px-3.5 py-2 text-left text-[13px] text-[#E24B4A] hover:bg-[#1B1F27]"
                        >
                          <GoTrash className="mr-2 inline-block" /> Supprimer
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Saisie */}
      {(replyingTo || editingMessageId) && (
        <div className="flex items-center justify-between border-t border-[#1F242C] bg-[#12151B] px-4 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-[#3ECF8E] pl-2">
            <p className="text-[11px] font-medium text-[#3ECF8E]">
              {editingMessageId ? 'Modifier le message' : `Réponse à ${chat.otherUser.name}`}
            </p>
            <p className="truncate text-[12px] text-[#8B92A0]">
              {editingMessageId
                ? messages.find((m) => m._id === editingMessageId)?.content
                : replyingTo?.content}
            </p>
          </div>
          <button
            onClick={cancelComposerAction}
            className="ml-2 rounded-full p-1.5 text-[#8B92A0] hover:bg-[#1B1F27]"
            aria-label="Annuler"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-[#1F242C] px-3 py-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />
        <button
          onClick={handlePickImage}
          disabled={uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8B92A0] transition-colors hover:bg-[#1B1F27] disabled:opacity-40"
          aria-label="Envoyer une image"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
        </button>

        <div className='flex-1 relative'>
          <input
            ref={inputRef}
            value={content}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Écrivez un message..."
            className="w-full rounded-full border border-[#232830] bg-[#12151B] px-4 py-2.5 text-sm text-[#F5F6F7] outline-none placeholder:text-[#5B6270] focus:border-[#3ECF8E]"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <EmojieModal onClick={(e) => setContent((prev) => prev + e)} />
          </div>
        </div>
        <button
          onClick={handleSend}
          disabled={!content.trim()}
          className="rounded-full bg-[#3ECF8E] px-5 py-2.5 text-sm font-medium text-[#04342C] transition-opacity disabled:opacity-30"
        >
          Envoyer
        </button>
      </div>

      {/* Visionneuse d'image */}
      {lightboxUrl && (
        <div
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
        >
          <div className="relative h-[80vh] w-[80vw] max-w-3xl items-center justify-center flex">
            <img
              src={lightboxUrl}
              alt="Image agrandie"
              className="rounded-2xl h-auto w-auto max-h-full max-w-full"
            />
          </div>
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
        </div>
      )}

      {/* Visionneuse vidéo */}
      {videoModalUrl && (
        <div
          onClick={() => setVideoModalUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
        >
          <video
            src={videoModalUrl}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] max-w-3xl rounded-lg"
          />
          <button
            onClick={() => setVideoModalUrl(null)}
            className="absolute right-6 top-6 rounded-full bg-white/10 p-2 text-white"
            aria-label="Fermer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18 18 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}