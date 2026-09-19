'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';
import chatService from '../../services/chatService';
import { useRouter } from 'next/navigation';
import {
  Conversation,
  ConversationType,
  getConversationId,
  getConversationName,
  getConversationAvatar,
} from '../../types/chat.types';
import { BiChevronLeft } from 'react-icons/bi';
import { HiMiniUserPlus, HiMiniUsers } from 'react-icons/hi2';
import { RiLogoutCircleLine } from 'react-icons/ri';

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
  if (isToday) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

function lastMessagePreview(conv: Conversation, userId: string) {
  const msg = conv.lastMessage;
  if (!msg) return 'Pas de messages';

  const isMine = msg.senderId === userId;
  const isRoom = conv.type === 'room';
  const senderLabel = isRoom && msg.senderName ? isMine ? 'Vous :' : `${msg.senderName}: ` : '';

  switch (msg.contentType) {
    case 'text':
      return `${senderLabel}${msg.content}`;
    case 'image':
      return `${senderLabel}📷 Photo`;
    case 'audio':
      return `${senderLabel}🎤 Message vocal`;
    case 'video':
      return `${senderLabel}🎥 Vidéo`;
    case 'document':
      return `${senderLabel}📄 Document`;
    default:
      return `${senderLabel}Fichier`;
  }
}

export function ConversationSidebar({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string, type: ConversationType) => void;
}) {
  const {
    conversations,
    loading,
    pendingInvites,
    fetchChats,
    addNewChat,
    markChatAsRead,
    markRoomAsRead,
    createRoom,
    acceptRoomInvite,
    declineRoomInvite,
  } = useChat();
  const { user, logout } = useAuth();
  const router = useRouter();

  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [allUsers, setAllUsers] = useState<DirectoryUser[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  // État formulaire nouvelle room
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomIsPrivate, setRoomIsPrivate] = useState(true);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingRoom, setCreatingRoom] = useState(false);

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
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      setUsers(allUsers.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)));
    } else {
      setUsers(allUsers);
    }
  }, [searchQuery, allUsers]);

  const openUserModal = async () => {
    if (allUsers.length === 0) await fetchUsers();
    setShowUserModal(true);
  };

  const openRoomModal = async () => {
    if (allUsers.length === 0) await fetchUsers();
    setRoomName('');
    setRoomDescription('');
    setRoomIsPrivate(true);
    setSelectedMemberIds([]);
    setShowRoomModal(true);
  };

  const startNewChat = async (selectedUser: DirectoryUser) => {
    setShowUserModal(false);
    setSearchQuery('');

    const existing = conversations.find(
      (c) => c.type === 'private' && c.otherUser._id === selectedUser._id
    );
    if (existing) {
      onSelect(getConversationId(existing), 'private');
      return;
    }

    try {
      const newChat = await chatService.createChat(user!._id, selectedUser._id);
      addNewChat(newChat);
      onSelect(newChat.chatId, 'private');
      fetchChats();
    } catch (err) {
      console.error('❌ Erreur lors de la création du chat:', err);
    }
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateRoom = async () => {
    if (!roomName.trim()) return;
    setCreatingRoom(true);
    try {
      const room = await createRoom({
        name: roomName.trim(),
        description: roomDescription.trim() || undefined,
        isPrivate: roomIsPrivate,
        memberIds: selectedMemberIds,
      });
      setShowRoomModal(false);
      onSelect(room.roomId, 'room');
    } catch (err) {
      console.error('❌ Erreur création room:', err);
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleConversationClick = async (conv: Conversation) => {
    const id = getConversationId(conv);
    if (conv.type === 'private') {
      await markChatAsRead(id);
    } else {
      await markRoomAsRead(id);
    }
    onSelect(id, conv.type);
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
            <BiChevronLeft size={30} className="text-[#8B92A0]" />
          </button>
          <p className="text-[19px] font-medium text-[#F5F6F7]" style={{ fontFamily: 'var(--font-space-grotesk, sans-serif)' }}>
            Conversations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {pendingInvites.length > 0 && (
            <button
              onClick={() => setShowInvites(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#8B92A0] hover:bg-[#1B1F27]"
              aria-label="Invitations"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5a6 6 0 0 0-4-5.66V4a2 2 0 1 0-4 0v1.34A6 6 0 0 0 6 11v5l-2 2v1h16v-1l-2-2z" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#E24B4A] text-[9px] font-bold text-white">
                {pendingInvites.length}
              </span>
            </button>
          )}
          <button
            onClick={openRoomModal}
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#8B92A0] hover:bg-[#1B1F27]"
            aria-label="Nouveau salon"
            title="Nouveau salon"
          >
            <HiMiniUsers className="text-2xl" />
          </button>
          <button
            onClick={openUserModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#3ECF8E] text-[#04342C] transition-opacity hover:opacity-90 text-2xl"
            aria-label="Nouvelle conversation"
          >
            +
          </button>
        </div>
      </div>

      {/* Liste */}
      {loading && conversations.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-[#8B92A0]">
          Chargement des conversations...
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-[#F5F6F7]">💬 Aucune conversation</p>
          <p className="text-xs text-[#8B92A0]">Démarrez une discussion ou créez un salon</p>
        </div>
      ) : (
        <div className="scrollbar-theme flex-1 overflow-y-auto border-b border-[#1F242C]">
          {conversations.map((conv) => {
            const id = getConversationId(conv);
            const isActive = id === selectedId;
            const isUnread = (conv.unreadCount ?? 0) > 0;
            const name = getConversationName(conv);
            const avatar = getConversationAvatar(conv);
            const isMine = conv.type === 'private' && conv.lastMessage?.senderId === user?._id;

            return (
              <button
                key={id}
                onClick={() => handleConversationClick(conv)}
                className={`flex w-full items-center gap-3 border-b border-[#1F242C] px-3 py-3 text-left transition-colors ${isActive ? 'bg-[#1B1F27]' : 'hover:bg-[#12151B]'
                  }`}
              >
                <div className="relative shrink-0">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt={name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full border border-[#232830] object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold text-[#04342C]"
                      style={{ backgroundColor: conv.type === 'room' ? '#5B8DEF' : '#3ECF8E' }}
                    >
                      {conv.type === 'room' ? (
                        <HiMiniUsers className="text-2xl" />
                      ) : (
                        initials(name)
                      )}
                    </div>
                  )}
                  {conv.type === 'private' && conv.otherUser.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0A0C10] bg-[#3ECF8E]" />
                  )}
                  {conv.type === 'room' && conv.isPrivate && (
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0A0C10] bg-[#1B1F27] text-[8px]">
                      🔒
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-medium capitalize text-[#F5F6F7]">{name}</p>
                    <span className="shrink-0 text-[11px] text-[#5B6270]" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isMine && conv.lastMessage && (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={conv.lastMessage.is_read ? '#3ECF8E' : '#5B6270'} strokeWidth="2.4" className="shrink-0">
                        {conv.lastMessage.is_read ? (
                          <path d="m1 12 5 5L17 6M8 12l5 5L24 6" />
                        ) : (
                          <path d="m4 12 5 5L20 6" />
                        )}
                      </svg>
                    )}
                    <p className={`truncate text-[13px] ${isUnread ? 'font-medium text-[#F5F6F7]' : 'text-[#8B92A0]'}`}>
                      {lastMessagePreview(conv, user?._id as string)}
                    </p>
                    {isUnread && (
                      <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#3ECF8E] px-1.5 text-[11px] font-medium text-[#04342C]">
                        {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <div className='flex items-center justify-between'>
        <div className="flex items-center gap-3 border-b border-[#1F242C] px-3 py-3 text-left">
          <div className="relative shrink-0">
            {user?.avatar ? (
              <Image
                src={user?.avatar}
                alt={user?.name}
                width={44}
                height={44}
                className="h-11 w-11 rounded-full border border-[#232830] object-cover"
              />
            ) : (
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full text-[13px] font-semibold text-[#04342C]"
                style={{ backgroundColor: '#3ECF8E' }}
              >
                {initials(user?.name || '')}
              </div>
            )}
            {(
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0A0C10] bg-[#3ECF8E]" />
            )}
          </div>
          <div>
            <p className="text-[14px] font-medium capitalize text-[#F5F6F7]">{user?.name}</p>
            <p className="text-[11px] text-[#5B6270]">{user?.email}</p>
          </div>

        </div>
        <button onClick={logout} className="m-2 cursor-pointer rounded-full bg-[#3ECF8E] p-2 text-sm text-black">
          <RiLogoutCircleLine size={20} />
        </button>
      </div>

      {/* Modale invitations en attente */}
      {showInvites && (
        <div
          onClick={() => setShowInvites(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[70vh] w-full flex-col rounded-t-2xl bg-[#12151B] sm:max-w-md sm:rounded-2xl"
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <p className="text-[17px] font-medium text-[#F5F6F7]">Invitations</p>
              <button onClick={() => setShowInvites(false)} className="rounded-full p-1.5 text-[#8B92A0] hover:bg-[#1B1F27]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>
            <div className="scrollbar-theme flex-1 overflow-y-auto px-4 pb-4">
              {pendingInvites.length === 0 ? (
                <p className="py-6 text-center text-sm text-[#8B92A0]">Aucune invitation</p>
              ) : (
                pendingInvites.map((invite) => (
                  <div key={invite.roomId} className="mb-2 rounded-xl bg-[#1B1F27] p-3">
                    <p className="text-[14px] font-medium text-[#F5F6F7]">{invite.name}</p>
                    <p className="text-[12px] text-[#8B92A0]">Invité par {invite.invitedByName}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => acceptRoomInvite(invite.roomId)}
                        className="flex-1 rounded-lg bg-[#3ECF8E] py-1.5 text-[13px] font-medium text-[#04342C]"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => declineRoomInvite(invite.roomId)}
                        className="flex-1 rounded-lg bg-[#232830] py-1.5 text-[13px] text-[#F5F6F7]"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale nouvelle conversation privée */}
      {showUserModal && (
        <div
          onClick={() => setShowUserModal(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
        >
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-[#12151B] sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <p className="text-[17px] font-medium text-[#F5F6F7]">Nouveau message</p>
              <button onClick={() => setShowUserModal(false)} className="rounded-full p-1.5 text-[#8B92A0] hover:bg-[#1B1F27]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>
            <div className="px-5 pb-3">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher une personne..."
                className="w-full rounded-full border border-[#232830] bg-[#0A0C10] px-4 py-2.5 text-sm text-[#F5F6F7] outline-none placeholder:text-[#5B6270] focus:border-[#3ECF8E]"
              />
            </div>
            <div className="scrollbar-theme flex-1 overflow-y-auto px-2 pb-4">
              {usersLoading ? (
                <p className="px-4 py-6 text-center text-sm text-[#8B92A0]">Chargement...</p>
              ) : users.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-[#8B92A0]">
                  {searchQuery ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur disponible'}
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
                        <Image src={u.avatar} alt={u.name} width={40} height={40} className="h-10 w-10 rounded-full border border-[#232830] object-cover" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full text-[12px] font-semibold text-[#04342C]" style={{ backgroundColor: '#3ECF8E' }}>
                          {initials(u.name)}
                        </div>
                      )}
                      {u.is_online && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#12151B] bg-[#3ECF8E]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium capitalize text-[#F5F6F7]">{u.name}</p>
                      <p className="truncate text-[12px] text-[#8B92A0]">{u.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale nouveau salon */}
      {showRoomModal && (
        <div
          onClick={() => setShowRoomModal(false)}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
        >
          <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full flex-col rounded-t-2xl bg-[#12151B] sm:max-w-md sm:rounded-2xl">
            <div className="flex items-center justify-between px-5 pb-3 pt-5">
              <p className="text-[17px] font-medium text-[#F5F6F7]">Nouveau salon</p>
              <button onClick={() => setShowRoomModal(false)} className="rounded-full p-1.5 text-[#8B92A0] hover:bg-[#1B1F27]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M6 18 18 6" />
                </svg>
              </button>
            </div>

            <div className="scrollbar-theme flex-1 overflow-y-auto px-5 pb-5">
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Nom du salon"
                className="mb-3 w-full rounded-lg border border-[#232830] bg-[#0A0C10] px-4 py-2.5 text-sm text-[#F5F6F7] outline-none placeholder:text-[#5B6270] focus:border-[#3ECF8E]"
              />
              <textarea
                value={roomDescription}
                onChange={(e) => setRoomDescription(e.target.value)}
                placeholder="Description (optionnel)"
                rows={2}
                className="mb-3 w-full resize-none rounded-lg border border-[#232830] bg-[#0A0C10] px-4 py-2.5 text-sm text-[#F5F6F7] outline-none placeholder:text-[#5B6270] focus:border-[#3ECF8E]"
              />

              <label className="mb-3 flex items-center justify-between rounded-lg bg-[#1B1F27] px-4 py-3">
                <div>
                  <p className="text-[13px] font-medium text-[#F5F6F7]">Salon privé</p>
                  <p className="text-[11px] text-[#8B92A0]">Seuls les membres invités peuvent voir ce salon</p>
                </div>
                <input
                  type="checkbox"
                  checked={roomIsPrivate}
                  onChange={(e) => setRoomIsPrivate(e.target.checked)}
                  className="h-5 w-5 accent-[#3ECF8E]"
                />
              </label>

              <p className="mb-2 text-[12px] font-medium text-[#8B92A0]">
                Inviter des membres ({selectedMemberIds.length} sélectionné{selectedMemberIds.length > 1 ? 's' : ''})
              </p>
              <div className="max-h-52 overflow-y-auto rounded-lg border border-[#232830]">
                {users.map((u) => {
                  const selected = selectedMemberIds.includes(u._id);
                  return (
                    <button
                      key={u._id}
                      onClick={() => toggleMemberSelection(u._id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${selected ? 'bg-[#1B1F27]' : 'hover:bg-[#12151B]'}`}
                    >
                      {u.avatar ? (
                        <Image src={u.avatar} alt={u.name} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-semibold text-[#04342C]" style={{ backgroundColor: '#3ECF8E' }}>
                          {initials(u.name)}
                        </div>
                      )}
                      <span className="flex-1 truncate text-[13px] text-[#F5F6F7]">{u.name}</span>
                      {selected && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3ECF8E" strokeWidth="2.4">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={!roomName.trim() || creatingRoom}
                className="mt-4 w-full rounded-lg bg-[#3ECF8E] py-2.5 text-sm font-medium text-[#04342C] disabled:opacity-40"
              >
                {creatingRoom ? 'Création...' : 'Créer le salon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}