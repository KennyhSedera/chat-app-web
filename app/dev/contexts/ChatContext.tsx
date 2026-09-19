'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { SERVER_URL } from "../services/authService";
import { useAuth } from "./AuthContext";
import chatService from "../services/chatService";
import {
  Chat,
  Room,
  RoomInvite,
  Conversation,
  ConversationType,
  getConversationId,
  Message,
} from "../types/chat.types";

type ChatContextType = {
  // Chats privés (conservé pour compat avec ChatWindow/ChatSidebar existants)
  chats: Chat[];
  // Rooms
  rooms: Room[];
  // Fusion triée des deux, pour la future sidebar unifiée
  conversations: Conversation[];
  pendingInvites: RoomInvite[];

  loading: boolean;
  unreadChatsCount: number;
  unreadRoomsCount: number;

  fetchChats: () => Promise<void>;
  fetchRooms: () => Promise<void>;
  fetchPendingInvites: () => Promise<void>;

  markChatAsRead: (chatId: string) => Promise<void>;
  markRoomAsRead: (roomId: string) => Promise<void>;

  updateChatWithNewMessage: (message: any, currentUserId: string) => void;
  updateRoomWithNewMessage: (message: any, currentUserId: string) => void;
  addNewChat: (newChat: Chat) => void;
  addNewRoom: (newRoom: Room) => void;

  setActiveChatId: (chatId: string | null) => void;
  setActiveRoomId: (roomId: string | null) => void;

  createRoom: (params: {
    name: string;
    description?: string;
    isPrivate: boolean;
    memberIds?: string[];
  }) => Promise<Room>;

  acceptRoomInvite: (roomId: string) => Promise<void>;
  declineRoomInvite: (roomId: string) => Promise<void>;
};

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [chats, setChats] = useState<Chat[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pendingInvites, setPendingInvites] = useState<RoomInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const listenersRef = useRef<Array<() => void>>([]);
  const isMountedRef = useRef(true);
  const activeChatIdRef = useRef<string | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  const setActiveChatId = useCallback((chatId: string | null) => {
    activeChatIdRef.current = chatId;
  }, []);

  const setActiveRoomId = useCallback((roomId: string | null) => {
    activeRoomIdRef.current = roomId;
  }, []);

  // ── Fetch chats privés ──────────────────────────────────────
  const fetchChats = useCallback(async () => {
    if (!user?._id) {
      setChats([]);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/chat/${user._id}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && isMountedRef.current) {
        const sorted = [...data.chats].sort((a: Chat, b: Chat) => {
          const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return dateB - dateA;
        });
        setChats(sorted);

        sorted.forEach((chat) => {
          chatService.subscribeToPrivateChat(chat.chatId);
        });
      }
    } catch (err) {
      console.error("❌ Erreur de récupération des chats:", err);
    }
  }, [user]);

  // ── Fetch rooms ──────────────────────────────────────────────
  const fetchRooms = useCallback(async () => {
    if (!user?._id) {
      setRooms([]);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/user/${user._id}`, {
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && isMountedRef.current) {
        const sorted = [...data.rooms].sort((a: Room, b: Room) => {
          const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return dateB - dateA;
        });
        setRooms(sorted);

        sorted.forEach((room) => {
          chatService.subscribeToRoom(room.roomId, user);
        });
      }
    } catch (err) {
      console.error("❌ Erreur de récupération des rooms:", err);
    }
  }, [user]);

  const fetchPendingInvites = useCallback(async () => {
    if (!user?._id) {
      setPendingInvites([]);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/invites/${user._id}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && isMountedRef.current) {
        setPendingInvites(data.invites);
      }
    } catch (err) {
      console.error("❌ Erreur de récupération des invitations:", err);
    }
  }, [user]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchChats(), fetchRooms(), fetchPendingInvites()]);
    if (isMountedRef.current) setLoading(false);
  }, [fetchChats, fetchRooms, fetchPendingInvites]);

  const handleNewMessage = useCallback(
    (message: any) => {
      if (!user?._id || !isMountedRef.current) return;
      if (processedMessageIdsRef.current.has(message._id)) return;
      processedMessageIdsRef.current.add(message._id);

      setChats((prevChats) => {
        const exists = prevChats.some((c) => c.chatId === message.chatId);
        if (!exists) return prevChats;

        const updated = prevChats.map((chat) => {
          if (chat.chatId !== message.chatId) return chat;

          const isFromMe = message.user._id === user._id;
          const isChatOpen = chat.chatId === activeChatIdRef.current;

          return {
            ...chat,
            lastMessage: {
              _id: message._id,
              content: message.content ?? "",
              contentType: message.contentType ?? "text",
              senderId: message.user?._id ?? user._id,
              is_read: Boolean(message.isRead),
            },
            lastMessageAt: message.createdAt,
            unreadCount:
              isFromMe || isChatOpen
                ? chat.unreadCount || 0
                : (chat.unreadCount || 0) + 1,
          };
        });

        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() -
            new Date(a.lastMessageAt || 0).getTime()
        );
      });
    },
    [user]
  );

  const handleNewChat = useCallback(
    (newChat: Chat) => {
      if (!user?._id || !isMountedRef.current) return;
      setChats((prev) => {
        if (prev.some((c) => c.chatId === newChat.chatId)) return prev;
        return [newChat, ...prev];
      });
    },
    [user]
  );

  const handleMessagesRead = useCallback(
    (data: { chatId: string; readByUserId: string }) => {
      if (!user?._id || !isMountedRef.current) return;
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.chatId !== data.chatId) return chat;
          if (chat.lastMessage?.senderId !== user._id) return chat;
          if (data.readByUserId === user._id) return chat;
          return { ...chat, lastMessage: { ...chat.lastMessage, is_read: true } };
        })
      );
    },
    [user]
  );

  const handleMessageDeleted = useCallback(
    (data: { _id: string; chatId?: string; roomId?: string; newLastMessage?: any }) => {
      if (!isMountedRef.current) return;

      if (data.chatId) {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.chatId !== data.chatId) return chat;
            if (chat.lastMessage?._id !== data._id) return chat;
            return {
              ...chat,
              lastMessage: data.newLastMessage
                ? {
                  _id: data.newLastMessage._id,
                  content: data.newLastMessage.content,
                  contentType: data.newLastMessage.contentType,
                  senderId: data.newLastMessage.senderId,
                  is_read: Boolean(data.newLastMessage.is_read),
                }
                : null,
              lastMessageAt: data.newLastMessage?.createdAt ?? null,
            };
          })
        );
      }

      if (data.roomId) {
        setRooms((prev) =>
          prev.map((room) => {
            if (room.roomId !== data.roomId) return room;
            if (room.lastMessage?._id !== data._id) return room;
            return {
              ...room,
              lastMessage: data.newLastMessage
                ? {
                  _id: data.newLastMessage._id,
                  content: data.newLastMessage.content,
                  contentType: data.newLastMessage.contentType,
                  senderId: data.newLastMessage.senderId,
                  senderName: data.newLastMessage.senderName,
                  is_read: Boolean(data.newLastMessage.is_read),
                }
                : null,
              lastMessageAt: data.newLastMessage?.createdAt ?? null,
            };
          })
        );
      }
    },
    []
  );

  const handleRoomRead = useCallback(
    (data: { roomId: string; userId: string; lastReadMessageId: string }) => {
      if (!user?._id || !isMountedRef.current) return;
      if (data.userId !== user._id) return;

      setRooms((prev) =>
        prev.map((room) => (room.roomId === data.roomId ? { ...room, unreadCount: 0 } : room))
      );
    },
    [user]
  );

  const handleUserStatusChange = useCallback((data: { userId: string; isOnline: boolean }) => {
    if (!isMountedRef.current) return;
    setChats((prev) =>
      prev.map((chat) =>
        chat.otherUser._id === data.userId
          ? { ...chat, otherUser: { ...chat.otherUser, is_online: data.isOnline } }
          : chat
      )
    );
  }, []);

  const markChatAsRead = useCallback(
    async (chatId: string) => {
      if (!user?._id) return;
      setChats((prev) =>
        prev.map((chat) => (chat.chatId === chatId ? { ...chat, unreadCount: 0 } : chat))
      );
      try {
        await fetch(`${SERVER_URL}/api/messages/read`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ chatId, userId: user._id }),
        });
      } catch (err) {
        console.error("❌ Erreur markChatAsRead:", err);
      }
    },
    [user]
  );

  const normalizeLastMessage = (message: any, fallbackSenderId = "") => ({
    _id: message?._id ?? message?.id ?? "",
    content: message?.content ?? "",
    contentType: message?.contentType ?? "text",
    senderId: message?.senderId ?? message?.user?._id ?? fallbackSenderId,
    senderName: message?.senderName ?? message?.user?.name ?? "",
    is_read: Boolean(message?.is_read ?? message?.isRead),
    createdAt: message?.createdAt,
  });

  const updateChatWithNewMessage = useCallback((message: any, currentUserId: string) => {
    setChats((prevChats) => {
      const updated = prevChats.map((chat) => {
        if (chat.chatId !== message.chatId) return chat;
        return {
          ...chat,
          lastMessage: normalizeLastMessage(message, currentUserId),
          lastMessageAt: message.createdAt,
        };
      });
      return updated.sort(
        (a, b) =>
          new Date(b.lastMessageAt || 0).getTime() -
          new Date(a.lastMessageAt || 0).getTime()
      );
    });
  }, []);

  const updateRoomWithNewMessage = useCallback(
    (message: Message, currentUserId: string) => {
      setRooms((prevRooms) => {
        const updated = prevRooms.map((room) => {
          if (room.roomId !== message.room) return room;

          return {
            ...room,
            lastMessage: normalizeLastMessage(message, currentUserId),
            lastMessageAt: message.createdAt,
          };
        });

        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() -
            new Date(a.lastMessageAt || 0).getTime()
        );
      });
    },
    []
  );

  const addNewChat = useCallback((newChat: Chat) => {
    setChats((prev) => {
      if (prev.some((c) => c.chatId === newChat.chatId)) return prev;
      return [newChat, ...prev];
    });
  }, []);

  const handleNewRoomMessage = useCallback(
    (message: any) => {
      if (!user?._id || !isMountedRef.current) return;
      if (processedMessageIdsRef.current.has(message._id)) return;
      processedMessageIdsRef.current.add(message._id);

      setRooms((prevRooms) => {
        const exists = prevRooms.some((r) => r.roomId === message.room);
        if (!exists) return prevRooms;

        const updated = prevRooms.map((room) => {
          if (room.roomId !== message.room) return room;

          const isFromMe = message.user._id === user._id;
          const isRoomOpen = room.roomId === activeRoomIdRef.current;

          return {
            ...room,
            lastMessage: {
              _id: message._id,
              content: message.content ?? "",
              contentType: message.contentType ?? "text",
              senderId: message.user?._id ?? user._id,
              senderName: message.user?.name,
              is_read: Boolean(message.isRead),
            },
            lastMessageAt: message.createdAt,
            unreadCount:
              isFromMe || isRoomOpen
                ? room.unreadCount || 0
                : (room.unreadCount || 0) + 1,
          };
        });

        return updated.sort(
          (a, b) =>
            new Date(b.lastMessageAt || 0).getTime() -
            new Date(a.lastMessageAt || 0).getTime()
        );
      });
    },
    [user]
  );

  const handleRoomInviteReceived = useCallback(
    (data: { room: Room; invitedBy: any }) => {
      if (!isMountedRef.current) return;
      setPendingInvites((prev) => {
        if (prev.some((i) => i.roomId === data.room.roomId)) return prev;
        return [
          {
            roomId: data.room.roomId,
            name: data.room.name,
            description: data.room.description,
            avatar: data.room.avatar,
            isPrivate: data.room.isPrivate,
            invitedByName: data.invitedBy?.name ?? "Un admin",
            invitedAt: new Date().toISOString(),
          },
          ...prev,
        ];
      });
    },
    []
  );

  const handleRoomUpdated = useCallback((data: { room: Room }) => {
    if (!isMountedRef.current) return;
    setRooms((prev) =>
      prev.map((r) => (r.roomId === data.room.roomId ? { ...r, ...data.room } : r))
    );
  }, []);

  const handleMemberJoined = useCallback((data: { roomId: string; userId: string }) => {
    if (!isMountedRef.current) return;
    setRooms((prev) =>
      prev.map((r) =>
        r.roomId === data.roomId ? { ...r, memberCount: r.memberCount + 1 } : r
      )
    );
  }, []);

  const handleMemberRemoved = useCallback((data: { roomId: string; userId: string }) => {
    if (!isMountedRef.current || !user?._id) return;
    if (data.userId === user._id) {
      // Je viens d'être retiré -> je fais disparaître la room de ma liste
      setRooms((prev) => prev.filter((r) => r.roomId !== data.roomId));
      return;
    }
    setRooms((prev) =>
      prev.map((r) =>
        r.roomId === data.roomId
          ? { ...r, memberCount: Math.max(0, r.memberCount - 1) }
          : r
      )
    );
  }, [user]);

  const handleRoomDeleted = useCallback((data: { roomId: string }) => {
    if (!isMountedRef.current) return;
    setRooms((prev) => prev.filter((r) => r.roomId !== data.roomId));
  }, []);

  const markRoomAsRead = useCallback((roomId: string) => {
    setRooms((prev) =>
      prev.map((room) => (room.roomId === roomId ? { ...room, unreadCount: 0 } : room))
    );
    return Promise.resolve();
  }, []);

  const addNewRoom = useCallback((newRoom: Room) => {
    setRooms((prev) => {
      if (prev.some((r) => r.roomId === newRoom.roomId)) return prev;
      return [newRoom, ...prev];
    });
  }, []);

  const createRoom = useCallback(
    ({
      name,
      description,
      isPrivate,
      memberIds = [],
    }: {
      name: string;
      description?: string;
      isPrivate: boolean;
      memberIds?: string[];
    }): Promise<Room> => {
      if (!user) return Promise.reject(new Error("Utilisateur non connecté"));

      return new Promise((resolve, reject) => {
        const socket = (chatService as any).socket;
        if (!socket) {
          reject(new Error("Socket non connecté"));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error("Timeout lors de la création du salon"));
        }, 10000);

        const onCreated = (data: { success: boolean; room: Room }) => {
          clearTimeout(timeout);
          socket.off("roomCreated", onCreated);
          socket.off("error", onError);
          addNewRoom(data.room);
          resolve(data.room);
        };

        const onError = (err: any) => {
          clearTimeout(timeout);
          socket.off("roomCreated", onCreated);
          socket.off("error", onError);
          reject(new Error(err?.message || "Échec de la création du salon"));
        };

        socket.on("roomCreated", onCreated);
        socket.on("error", onError);

        socket.emit("createRoomChannel", {
          name,
          description,
          isPrivate,
          memberIds,
          user,
        });
      });
    },
    [user, addNewRoom]
  );

  const acceptRoomInvite = useCallback(
    (roomId: string): Promise<void> => {
      if (!user) return Promise.reject(new Error("Utilisateur non connecté"));

      return new Promise((resolve, reject) => {
        const socket = (chatService as any).socket;
        if (!socket) {
          reject(new Error("Socket non connecté"));
          return;
        }

        const onAccepted = (data: { room: Room }) => {
          socket.off("roomInviteAccepted", onAccepted);
          setPendingInvites((prev) => prev.filter((i) => i.roomId !== roomId));
          addNewRoom(data.room);
          resolve();
        };

        socket.on("roomInviteAccepted", onAccepted);
        socket.emit("acceptRoomInvite", { roomId, userId: user._id });
      });
    },
    [user, addNewRoom]
  );

  const declineRoomInvite = useCallback(
    (roomId: string): Promise<void> => {
      if (!user) return Promise.reject(new Error("Utilisateur non connecté"));

      return new Promise((resolve, reject) => {
        const socket = (chatService as any).socket;
        if (!socket) {
          reject(new Error("Socket non connecté"));
          return;
        }

        const onDeclined = () => {
          socket.off("roomInviteDeclined", onDeclined);
          setPendingInvites((prev) => prev.filter((i) => i.roomId !== roomId));
          resolve();
        };

        socket.on("roomInviteDeclined", onDeclined);
        socket.emit("declineRoomInvite", { roomId, userId: user._id });
      });
    },
    [user]
  );

  const handleMessageEditedForSidebar = useCallback((data: { _id: string; content: string }) => {
    if (!isMountedRef.current) return;

    setChats((prev) =>
      prev.map((chat) =>
        chat.lastMessage?._id === data._id
          ? { ...chat, lastMessage: { ...chat.lastMessage, content: data.content } }
          : chat
      )
    );

    setRooms((prev) =>
      prev.map((room) =>
        room.lastMessage?._id === data._id
          ? { ...room, lastMessage: { ...room.lastMessage, content: data.content } }
          : room
      )
    );
  }, []);

  const markOnline = useCallback(async () => {
    if (!user?._id) return;
    try {
      await chatService.initialize();
      chatService.joinRoom("general", user);
    } catch (err) {
      console.error("❌ Erreur présence en ligne:", err);
    }
  }, [user]);

  useEffect(() => {
    isMountedRef.current = true;

    const setup = async () => {
      if (!user?._id) return;
      await chatService.initialize();
      chatService.joinRoom("general", user);
      fetchAll();

      listenersRef.current.forEach((unsub) => typeof unsub === "function" && unsub());
      listenersRef.current = [
        // chats privés
        chatService.on("newPrivateMessage", handleNewMessage),
        chatService.on("newChat", handleNewChat),
        chatService.on("userStatusChange", handleUserStatusChange),
        chatService.on("messagesRead", handleMessagesRead),
        chatService.on("messageDeleted", handleMessageDeleted),
        // rooms
        chatService.on("newRoomMessage", handleNewRoomMessage),
        chatService.on("roomInviteReceived", handleRoomInviteReceived),
        chatService.on("messageEdited", handleMessageEditedForSidebar),
        chatService.on("roomUpdated", handleRoomUpdated),
        chatService.on("memberJoined", handleMemberJoined),
        chatService.on("memberRemoved", handleMemberRemoved),
        chatService.on("roomDeleted", handleRoomDeleted), chatService.on("roomRead", handleRoomRead),

        chatService.on("reconnect", () => fetchAll()),
      ];
    };

    setup();

    return () => {
      isMountedRef.current = false;
      listenersRef.current.forEach((unsub) => typeof unsub === "function" && unsub());
      listenersRef.current = [];
    };
  }, [
    user,
    fetchAll,
    handleNewMessage,
    handleNewChat,
    handleUserStatusChange,
    handleMessagesRead,
    handleMessageDeleted,
    handleNewRoomMessage,
    handleRoomInviteReceived,
    handleRoomUpdated,
    handleMemberJoined,
    handleMemberRemoved,
    handleRoomDeleted,
  ]);

  // ── Visibility / reconnexion réseau ────────────────────────────
  useEffect(() => {
    if (!user?._id) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markOnline();
        fetchAll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleOnline = () => {
      markOnline();
      fetchAll();
    };
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [user, markOnline, fetchAll]);

  // ── Fusion conversations ────────────────────────────────────────
  const conversations: Conversation[] = useMemo(() => {
    const privateConvs: Conversation[] = chats.map((c) => ({ type: "private", ...c }));
    const roomConvs: Conversation[] = rooms.map((r) => ({ type: "room", ...r }));
    return [...privateConvs, ...roomConvs].sort((a, b) => {
      const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [chats, rooms]);

  const unreadChatsCount = useMemo(
    () => chats.filter((c) => (c.unreadCount || 0) > 0).length,
    [chats]
  );

  const unreadRoomsCount = useMemo(
    () => rooms.filter((r) => (r.unreadCount || 0) > 0).length,
    [rooms]
  );

  const value: ChatContextType = {
    chats,
    rooms,
    conversations,
    pendingInvites,
    loading,
    unreadChatsCount,
    unreadRoomsCount,
    fetchChats,
    fetchRooms,
    fetchPendingInvites,
    markChatAsRead,
    markRoomAsRead,
    updateChatWithNewMessage,
    updateRoomWithNewMessage,
    addNewChat,
    addNewRoom,
    setActiveChatId,
    setActiveRoomId,
    createRoom,
    acceptRoomInvite,
    declineRoomInvite,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat doit être utilisé dans un ChatProvider");
  return ctx;
};