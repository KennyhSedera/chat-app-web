'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import chatService from '../../services/chatService';
import { useRouter } from 'next/navigation';

// ────────────────────────────────────────────────────────────
// Types & helpers
// ────────────────────────────────────────────────────────────

type ChatListItem = ReturnType<typeof useChat>['chats'][number];

type DirectoryUser = {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  is_online?: boolean;
};

function formatTime(dateStr: string | null) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function lastMessagePreview(chat: ChatListItem, isMine: boolean) {
  const msg = chat.lastMessage;
  if (!msg) return 'Pas de messages';

  const prefixShort = isMine ? 'Vous : ' : '';
  const prefixLong = isMine ? 'Vous avez envoyé' : `${chat.otherUser.name} a envoyé`;

  switch (msg.contentType) {
    case 'text':
      return `${prefixShort}${msg.content}`;
    case 'image':
      return `${prefixLong} une photo 📷`;
    case 'audio':
      return `${prefixLong} un message vocal 🎤`;
    case 'video':
      return `${prefixLong} une vidéo 🎥`;
    case 'document':
      return `${prefixLong} un document ${msg.content || ''} 📄`;
    default:
      return `${prefixShort}Fichier`;
  }
}

// ────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────

export function ChatSidebar({
  selectedChatId,
  onSelectChat,
}: {
  selectedChatId: string | null;
  onSelectChat: (chatId: string) => void;
}) {
  const { chats, loading, fetchChats, addNewChat, markChatAsRead } =
    useChat();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [showUserModal, setShowUserModal] = useState(false);
  const [allUsers, setAllUsers] = useState<DirectoryUser[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    if (!user?._id) return;
    setUsersLoading(true);
    try {
      const data = await chatService.getUsers();
      if (data.success) {
        const otherUsers = data.users.filter((u: DirectoryUser) => u._id !== user._id);
        if (isMountedRef.current) {
          setAllUsers(otherUsers);
          setUsers(otherUsers);
        }
      }
    } catch (err) {
      console.error('❌ Erreur de récupération des utilisateurs:', err);
    } finally {
      if (isMountedRef.current) setUsersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;

    const handleNewChat = (newChat: ChatListItem) => addNewChat(newChat);
    const handleUserStatusChange = (data: { userId: string; isOnline: boolean }) => {
      const updateStatus = (list: DirectoryUser[]) =>
        list.map((u) => (u._id === data.userId ? { ...u, is_online: data.isOnline } : u));
      setAllUsers(updateStatus);
      setUsers(updateStatus);
    };
    const handleReconnect = () => {
      fetchChats();
      fetchUsers();
    };

    const unsubNewChat = chatService.on('newChat', handleNewChat);
    const unsubStatus = chatService.on('userStatusChange', handleUserStatusChange);
    const unsubReconnect = chatService.on('reconnect', handleReconnect);

    fetchUsers();

    return () => {
      unsubNewChat();
      unsubStatus();
      unsubReconnect();
    };
  }, [user, addNewChat, fetchChats, fetchUsers]);

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      setUsers(
        allUsers.filter(
          (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
        ),
      );
    } else {
      setUsers(allUsers);
    }
  }, [searchQuery, allUsers]);

  const handleNewMessagePress = async () => {
    if (allUsers.length === 0) await fetchUsers();
    setShowUserModal(true);
  };

  const startNewChat = async (selectedUser: DirectoryUser) => {
    setShowUserModal(false);
    setSearchQuery('');

    const existingChat = chats.find((chat) => chat.otherUser._id === selectedUser._id);
    if (existingChat) {
      onSelectChat(existingChat.chatId);
      return;
    }

    try {
      const newChat = await chatService.createChat(user!._id, selectedUser._id);
      addNewChat(newChat);
      onSelectChat(newChat.chatId);
      fetchChats();
    } catch (err) {
      console.error('❌ Erreur lors de la création du chat:', err);
    }
  };

  const handleChatClick = async (chat: ChatListItem) => {
    await markChatAsRead(chat.chatId);
    onSelectChat(chat.chatId);
  };

  return (
    <div className="relative flex h-full flex-col bg-[#0A0C10]">
      {/* En-tête */}
      <div className="flex items-center justify-between border-b border-[#1F242C] px-4 py-4">
        <div className="flex items-center">
          <button
            onClick={() => router.back()}
            className="mr-2 rounded-md p-2 hover:bg-[#1F242C] md:hidden"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p
            className="text-[19px] font-medium text-[#F5F6F7]"
            style={{ fontFamily: 'var(--font-space-grotesk, sans-serif)' }}
          >
            Conversations
          </p>
        </div>
        <button
          onClick={handleNewMessagePress}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3ECF8E] text-[#04342C] transition-opacity hover:opacity-90"
          aria-label="Nouvelle conversation"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* Liste */}
      {loading && chats.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[#8B92A0]">
          Chargement des conversations...
        </div>
      ) : chats.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-[#F5F6F7]">💬 Aucune conversation</p>
          <p className="text-xs text-[#8B92A0]">Démarrez une discussion avec le bouton +</p>
        </div>
      ) : (
        <div className="scrollbar-theme flex-1 overflow-y-auto border-b border-[#1F242C] ">
          {chats.map((chat) => {
            const isActive = chat.chatId === selectedChatId;
            const isUnread = (chat.unreadCount ?? 0) > 0;
            const isMine = chat.lastMessage?.senderId === user?._id;

            return (
              <button
                key={chat.chatId}
                onClick={() => handleChatClick(chat)}
                className={`flex w-full items-center gap-3 border-b border-[#1F242C] px-3 py-3 text-left transition-colors ${isActive ? 'bg-[#1B1F27]' : 'hover:bg-[#12151B]'
                  }`}
              >
                <div className="relative shrink-0">
                  {chat.otherUser.avatar ? (
                    <Image
                      src={chat.otherUser.avatar}
                      alt={chat.otherUser.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full border border-[#232830] object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold text-[#04342C]"
                      style={{ backgroundColor: '#3ECF8E' }}
                    >
                      {initials(chat.otherUser.name)}
                    </div>
                  )}
                  {chat.otherUser.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0A0C10] bg-[#3ECF8E]" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-medium capitalize text-[#F5F6F7]">
                      {chat.otherUser.name}
                    </p>
                    <span
                      className="shrink-0 text-[11px] text-[#5B6270]"
                      style={{ fontFamily: 'var(--font-mono, monospace)' }}
                    >
                      {formatTime(chat.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isMine && chat.lastMessage && (
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={chat.lastMessage.is_read ? '#3ECF8E' : '#5B6270'}
                        strokeWidth="2.4"
                        className="shrink-0"
                      >
                        {chat.lastMessage.is_read ? (
                          <path d="m1 12 5 5L17 6M8 12l5 5L24 6" />
                        ) : (
                          <path d="m4 12 5 5L20 6" />
                        )}
                      </svg>
                    )}
                    <p
                      className={`truncate text-[13px] ${isUnread ? 'font-medium text-[#F5F6F7]' : 'text-[#8B92A0]'
                        }`}
                    >
                      {lastMessagePreview(chat, isMine)}
                    </p>
                    {isUnread && (
                      <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#3ECF8E] px-1.5 text-[11px] font-medium text-[#04342C]">
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button onClick={logout} className="m-2 cursor-pointer bg-[#3ECF8E] text-black p-3 text-sm rounded-lg">Se déconnecter</button>

      {/* Modale nouvelle conversation */}
      {showUserModal && (
        <div
          onClick={() => setShowUserModal(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="
        flex max-h-[85vh] w-full flex-col
        rounded-t-2xl bg-[#12151B]
        sm:max-w-md sm:rounded-2xl
      "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <div className="flex items-center gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F5F6F7"
                  strokeWidth="1.8"
                >
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>

                <p
                  className="text-[17px] font-medium text-[#F5F6F7]"
                  style={{
                    fontFamily: 'var(--font-space-grotesk, sans-serif)',
                  }}
                >
                  Nouveau message
                </p>
              </div>

              <button
                onClick={() => setShowUserModal(false)}
                className="rounded-full p-1.5 text-[#8B92A0] hover:bg-[#1B1F27]"
                aria-label="Fermer"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>

            {/* Recherche */}
            <div className="px-5 pb-3">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une personne..."
                className="w-full rounded-full border border-[#232830] bg-[#0A0C10] px-4 py-2.5 text-sm text-[#F5F6F7] outline-none placeholder:text-[#5B6270] focus:border-[#3ECF8E]"
              />
            </div>

            {/* Utilisateurs */}
            <div className="scrollbar-theme flex-1 overflow-y-auto px-2 pb-4">
              {usersLoading ? (
                <p className="px-4 py-6 text-center text-sm text-[#8B92A0]">
                  Chargement...
                </p>
              ) : users.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[#8B92A0]">
                  {searchQuery
                    ? 'Aucun utilisateur trouvé'
                    : 'Aucun utilisateur disponible'}
                </p>
              ) : (
                users.map((u) => (
                  <button
                    key={u._id}
                    onClick={() => startNewChat(u)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[#1B1F27]"
                  >
                    <div className="relative shrink-0">
                      {u.avatar ? (
                        <Image
                          src={u.avatar}
                          alt={u.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full border border-[#232830] object-cover"
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold text-[#04342C]"
                          style={{ backgroundColor: '#3ECF8E' }}
                        >
                          {initials(u.name)}
                        </div>
                      )}

                      {u.is_online && (
                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#12151B] bg-[#3ECF8E]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium capitalize text-[#F5F6F7]">
                        {u.name}
                      </p>

                      <p className="truncate text-[12px] text-[#8B92A0]">
                        {u.email}
                      </p>
                    </div>

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#5B6270"
                      strokeWidth="2"
                    >
                      <path d="m9 6 6 6-6 6" />
                    </svg>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}