import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '../../contexts/ChatContext';
import { Message } from '../../types/chat.types';
import { useAuth } from '../../contexts/AuthContext';
import uploadService from '../../services/uploadService';
import chatService from '../../services/chatService';
import { BiChevronLeft, BiSend } from 'react-icons/bi';
import Image from 'next/image';
import { HiMiniUsers } from 'react-icons/hi2';
import { formatDaySeparator, formatTime, groupMessages, initials, renderBubble } from './ChatWindow';
import { MdCopyAll, MdReply } from 'react-icons/md';
import { IoIosShareAlt } from 'react-icons/io';
import { FiEdit } from 'react-icons/fi';
import { GoTrash } from 'react-icons/go';
import EmojieModal from '../EmojieModal';

const getReplyText = (
  message: Message,
  currentUserId?: string,
) => {
  if (!message.replyTo) return null;

  const isReplyMine = message.user?._id === currentUserId;
  const isOriginalMine = message.replyTo.user?._id === currentUserId;

  if (!isReplyMine && !isOriginalMine && message.user?._id === message.replyTo.user?._id) {
    return `${message.user?.name} a répondu à son message`;
  }
  if (!isReplyMine && isOriginalMine) {
    return `${message.user?.name} a répondu à votre message`;
  }
  if (isReplyMine && isOriginalMine) {
    return `Vous avez répondu à votre message`;
  }
  if (isReplyMine) {
    return `Vous avez répondu au message de ${message.replyTo.user?.name}`;
  }
  return `${message.user?.name} a répondu au message de ${message.replyTo.user?.name}`;
};

type ReadReceipt = { userId: string; lastReadMessageId: string | number; name: string; avatar: string | null };

function RoomChatBody({ roomId, onBack }: { roomId: string; onBack: () => void }) {
  const { user } = useAuth();
  const router = useRouter();
  const { rooms, markRoomAsRead, updateRoomWithNewMessage, setActiveRoomId } = useChat();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState({
    isTyping: false,
    username: '',
  });
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<'top' | 'bottom'>('bottom');

  const [readReceipts, setReadReceipts] = useState<ReadReceipt[]>([]);

  const isNearBottomRef = useRef(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const infoRoom = rooms.find(room => room.roomId === roomId);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const threshold = 100; // px de tolérance
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const fetchMessages = useCallback(() => {
    if (!user?._id) return;
    setLoading(true);
    setError(null);
    chatService.joinRoomChannel(roomId, user);
    markRoomAsRead(roomId);
  }, [roomId, user, markRoomAsRead]);

  useEffect(() => {
    if (!roomId) return;
    chatService.getRoomReadReceipts(roomId).then((data) => {
      if (data.success) setReadReceipts(data.receipts);
    });
  }, [roomId]);

  useEffect(() => {
    if (!roomId || !user?._id) return;

    setActiveRoomId(roomId);
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
      if (!isMounted || message.room !== roomId) return;

      const isMine = message.user._id === user?._id;

      setMessages((prev) => {
        if (prev.some((m) => m._id === message._id)) return prev;
        return [...prev, message];
      });

      updateRoomWithNewMessage(message, user?._id ?? '');
      if (message.user._id !== user._id) {
        chatService.markRoomRead(roomId, user._id, message._id);
      }

      if (isMine || isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom('smooth'));
      }
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

    const handleDeleted = (data: { _id: string }) => {
      if (!isMounted) return;

      setMessages((prev) =>
        prev.filter((m) => m._id !== data._id)
      );
    };

    const handleTyping = (data: {
      roomId: string;
      user: { _id: string, name: string };
      isTyping: boolean;
    }) => {
      if (!isMounted) {
        return;
      }

      if (!isMounted || data.roomId !== roomId || data.user._id === user?._id) {
        return;
      }

      setOtherUserTyping({ isTyping: data.isTyping, username: data.user.name });
    };

    const handleRoomRead = (data: { roomId: string; userId: string; lastReadMessageId: string }) => {
      if (data.roomId !== roomId) return;
      setReadReceipts((prev) => {
        const existing = prev.find((r) => r.userId === data.userId);
        if (existing) {
          return prev.map((r) =>
            r.userId === data.userId ? { ...r, lastReadMessageId: data.lastReadMessageId } : r
          );
        }
        return prev;
      });
    };

    const unsubRoomRead = chatService.on('roomRead', handleRoomRead);
    const unsubDeleted = chatService.on('messageDeleted', handleDeleted);
    const unsubEdited = chatService.on('messageEdited', handleEdited);
    const unsubReactionAdded = chatService.on('reactionAdded', handleReactionAdded);
    const unsubReactionRemoved = chatService.on('reactionRemoved', handleReactionRemoved);

    const unsubPrevious = chatService.on('previousRoomMessages', handlePrevious);
    const unsubNew = chatService.on('newRoomMessage', handleNew);
    const unsubTyping = chatService.on('userRoomTyping', handleTyping);

    try {
      chatService.joinRoomChannel(roomId, user);
    } catch (e) {
      console.error('❌ Erreur de connexion au chat:', e);
      setError('Impossible de se connecter au chat');
      setLoading(false);
    }

    return () => {
      isMounted = false;
      unsubPrevious();
      setActiveRoomId(null);
      unsubNew();
      unsubEdited();
      unsubReactionAdded();
      unsubDeleted();
      unsubReactionRemoved();
      unsubRoomRead();
      unsubTyping();
      chatService.leaveRoomChannel(roomId);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [roomId, user?._id, setActiveRoomId, scrollToBottom,]);

  useEffect(() => {
    const closeMenu = () => setMenuMessageId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;

    const socket = (chatService as any).socket as { emit?: (event: string, payload: unknown) => void } | null;
    if (!socket?.emit) return;

    setUploading(true);
    try {
      const uploaded = await uploadService.uploadFile(file, 'image');
      socket.emit('sendRoomMessage', {
        roomId,
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

  const handlePickImage = () => fileInputRef.current?.click();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      // handleSend();
    }
  };

  const handleInputFocus = () => {
    setIsTyping(true);
    chatService.sendRoomTyping(true, roomId);
  };

  const handleInputBlur = () => {
    setIsTyping(false);
    chatService.sendRoomTyping(false, roomId);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleInputChange = (text: string) => {
    setContent(text);

    if (!isTyping) {
      setIsTyping(true);
      chatService.sendRoomTyping(true, roomId);
    }
  };

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
    chatService.sendRoomTyping(false, roomId);

    try {
      await chatService.sendRoomMessage(trimmed, roomId, user, { replyToMessageId });
      inputRef.current?.blur();
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      setContent(trimmed);
    }
  };

  const grouped = useMemo(() => groupMessages(messages), [messages]);

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

  const cancelComposerAction = () => {
    setReplyingTo(null);
    setEditingMessageId(null);
    setContent('');
  };

  if (!infoRoom) {
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
      {/* Header */}
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
          {infoRoom?.avatar ? (
            <Image
              src={infoRoom?.avatar || ''}
              alt={infoRoom.name || ''}
              width={40}
              height={40}
              className="h-10 w-10 rounded-full border border-[#232830] object-cover"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold text-[#04342C]"
              style={{ backgroundColor: '#5B8DEF', fontFamily: 'var(--font-space-grotesk, sans-serif)' }}
            >
              <HiMiniUsers className="text-2xl" />
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-[#0A0C10] bg-[#1B1F27] dark:bg-slate-100 text-[8px]">
            🔒
          </span>
        </div>
        <div className="min-w-0">
          <p
            className="truncate text-[15px] font-medium capitalize text-[#F5F6F7]"
            style={{ fontFamily: 'var(--font-space-grotesk, sans-serif)' }}
          >
            {infoRoom?.name}
          </p>
          <p className={`text-[12px] ${otherUserTyping.isTyping ? 'text-[#3ECF8E]' : 'text-[#8B92A0]'}`}>
            {otherUserTyping.isTyping ? otherUserTyping.username + ' en train d’écrire...' : `${infoRoom.memberCount} membre${infoRoom.memberCount > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="scrollbar-theme flex-1 overflow-y-auto px-4 py-4" onScroll={handleScroll}>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-[#8B92A0]">
            Chargement des messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <p className="text-sm text-[#F5F6F7]">Aucun message pour l&apos;instant</p>
            <p className="text-[13px] text-[#8B92A0]">Dites bonjour à vos amis dans  {infoRoom.name} 👋</p>
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
              const currentUserId = user?._id

              const allMyMessages = grouped.filter(
                (m) =>
                  m.type === "message" &&
                  m.senderId === currentUserId
              );

              const lastMyMessage = allMyMessages.at(-1);

              const otherReadReceipts = readReceipts.filter(
                (r) => r.userId !== currentUserId
              );


              const allAsRead =
                !!lastMyMessage &&
                otherReadReceipts.length === infoRoom.memberCount - 1 &&
                otherReadReceipts.every(
                  (r) =>
                    Number(r.lastReadMessageId) >= Number(lastMyMessage.message?._id)
                );

              const anyoneAsReaded =
                !!lastMyMessage &&
                otherReadReceipts.some(
                  (r) =>
                    Number(r.lastReadMessageId) >= Number(lastMyMessage.message?._id)
                );

              const getLastMyMessageReadBy = (readReceipt: typeof readReceipts[number]) => {
                const readId = Number(readReceipt.lastReadMessageId);

                const myMessagesBeforeRead = allMyMessages.filter(
                  (m) => Number(m.message?._id) <= readId
                );

                return myMessagesBeforeRead[myMessagesBeforeRead.length - 1];
              };

              const seenBy = readReceipts
                .filter((r) => r.userId !== user?._id)
                .filter((r) => {
                  const lastMyMessageRead = getLastMyMessageReadBy(r);

                  return (
                    lastMyMessageRead &&
                    Number(lastMyMessageRead.message?._id) === Number(message._id)
                  );
                });

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
                  {!isMine && <div className="flex w-7 shrink-0 justify-center">
                    {!isMine && item.isLastOfGroup && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1B1F27] border border-[#a5a5a5] text-[10px] font-semibold text-[#8B92A0]">
                        {message.user.avatar ? <Image src={message.user.avatar} alt={message.user.name} width={24} height={24} className="h-6 w-6 rounded-full object-cover" /> : initials(message.user.name)}
                      </div>
                    )}
                  </div>}
                  <div className={`flex max-w-[70%] flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    {!isMine && item.isFirstOfGroup && !message.replyTo && <span className="text-[11px] text-[#8B92A0] ml-2">{message.user?.name}</span>}
                    {message.replyTo && (
                      <span className="ml-1 text-[11px] text-[#8B92A0] mb-1">
                        <MdReply className="inline-block text-black dark:text-white text-[13px]" /> {getReplyText(message, user?._id)}
                      </span>
                    )}

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
                            stroke={allAsRead ? '#3ECF8E' : '#5B6270'}
                            strokeWidth="2.4"
                          >
                            {i === lastMyMessageIndex && (anyoneAsReaded ? (
                              <path d="m1 12 5 5L17 6M8 12l5 5L24 6" />
                            ) : (
                              <path d="m4 12 5 5L20 6" />
                            ))}
                          </svg>
                        )}
                      </span>
                    )}

                    {isMine && seenBy.length > 0 && (
                      <div className="mt-1 flex -space-x-1.5">
                        {seenBy.map((r) => (
                          <div
                            key={r.userId}
                            className="h-4 w-4 overflow-hidden rounded-full border border-[#0A0C10]"
                            title={r.name}
                          >
                            {r.avatar ? (
                              <Image
                                src={r.avatar}
                                alt={r.name}
                                width={16}
                                height={16}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center text-[7px] font-bold">
                                {r.name[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bouton d'actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const button = e.currentTarget;
                      const rect = button.getBoundingClientRect();
                      const container = button.closest('.scrollbar-theme'); // le conteneur scrollable des messages
                      const containerRect = container?.getBoundingClientRect();

                      if (containerRect) {
                        const spaceBelow = containerRect.bottom - rect.bottom;
                        const MENU_HEIGHT_ESTIMATE = 280; // hauteur approximative du menu (emojis + actions)
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

      {/* Input */}
      {(replyingTo || editingMessageId) && (
        <div className="flex items-center justify-between border-t border-[#1F242C] bg-[#12151B] px-4 py-2">
          <div className="min-w-0 flex-1 border-l-2 border-[#3ECF8E] pl-2">
            <p className="text-[11px] font-medium text-[#3ECF8E]">
              {editingMessageId ? 'Modifier le message' : `Réponse à ${replyingTo?.user.name}`}
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
          className="rounded-full bg-[#3ECF8E] md:px-5 p-2.5 text-sm font-medium text-[#04342C] transition-opacity disabled:opacity-30"
        >
          <span className="hidden md:block">Envoyer</span>
          <span className="md:hidden block"><BiSend size={20} /></span>
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
  )
}

export default RoomChatBody
