import { io, Socket } from "socket.io-client";
import { SERVER_URL } from "./authService";
import { getSocketTokenAction } from "../actions/auth.actions";
import { Message } from "../types/chat.types";

type EventCallback = (data: any) => void;

class ChatService {
  private socket: Socket | null = null;
  private isConnected = false;
  private eventListeners: Record<string, EventCallback[]> = {};
  private currentChatId: string | null = null;
  private currentRoom: string | null = null;
  private currentUser: any = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 1000;

  async initialize(): Promise<void> {
    if (this.socket && this.isConnected) {
      return Promise.resolve();
    }

    const token = await getSocketTokenAction();

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(SERVER_URL, {
          transports: ["websocket"],
          timeout: 10000,
          forceNew: true,
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionAttempts: this.maxReconnectAttempts,
          auth: { token },
        });

        this.socket.on("connect", () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit("connect", undefined);

          if (this.currentUser) {
            if (this.currentChatId) {
              this.socket!.emit("joinPrivateChat", {
                chatId: this.currentChatId,
                user: this.currentUser,
              });
            }
            if (this.currentRoom) {
              this.socket!.emit("joinRoom", {
                room: this.currentRoom,
                user: this.currentUser,
              });
            }
          }

          resolve();
        });

        this.socket.on("disconnect", (reason) => {
          this.isConnected = false;
          this.emit("disconnect", reason);
        });

        this.socket.on("reconnect", (attemptNumber) => {
          this.isConnected = true;
          this.emit("reconnect", attemptNumber);
        });

        this.socket.on("reconnect_error", (error) => {
          console.error("❌ Erreur de reconnexion:", error);
          this.emit("reconnect_error", error);
        });

        this.socket.on("error", (error) => {
          console.error("❌ Erreur socket:", error);
          this.emit("error", error);
          reject(error);
        });

        this.socket.on("connect_error", (error) => {
          console.error("❌ Erreur de connexion:", error);
          this.emit("connect_error", error);
          reject(error);
        });

        this.socket.on(
          "previousRoomMessages",
          (data: { roomId: string; messages: Message[] }) => {
            this.emit("previousRoomMessages", data.messages);
          },
        );

        this.socket.on("roomRead", (data) => this.emit("roomRead", data));
        this.socket.on("newRoomMessage", (message) => this.emit("newRoomMessage", message));
        this.socket.on("userRoomTyping", (data) => this.emit("userRoomTyping", data));
        this.socket.on("roomCreated", (data) => this.emit("roomCreated", data));
        this.socket.on("roomInviteReceived", (data) => this.emit("roomInviteReceived", data));
        this.socket.on("roomInviteAccepted", (data) => this.emit("roomInviteAccepted", data));
        this.socket.on("roomInviteDeclined", (data) => this.emit("roomInviteDeclined", data));
        this.socket.on("roomUpdated", (data) => this.emit("roomUpdated", data));
        this.socket.on("memberJoined", (data) => this.emit("memberJoined", data));
        this.socket.on("memberRemoved", (data) => this.emit("memberRemoved", data));
        this.socket.on("memberRoleChanged", (data) => this.emit("memberRoleChanged", data));
        this.socket.on("youWerePromoted", (data) => this.emit("youWerePromoted", data));
        this.socket.on("roomDeleted", (data) => this.emit("roomDeleted", data));

        this.socket.on("messageDeleted", (data) => { this.emit("messageDeleted", data) });
        this.socket.on("messagesRead", (data) => this.emit("messagesRead", data));
        this.socket.on("messageEdited", (data) => this.emit("messageEdited", data));
        this.socket.on("reactionAdded", (data) => this.emit("reactionAdded", data));
        this.socket.on("reactionRemoved", (data) => this.emit("reactionRemoved", data));
        this.socket.on("newPrivateMessage", (message) => this.emit("newPrivateMessage", message));
        this.socket.on("newMessage", (message) => this.emit("newMessage", message));
        this.socket.on("previousPrivateMessages", (messages) => this.emit("previousPrivateMessages", messages));
        this.socket.on("previousMessages", (messages) => this.emit("previousMessages", messages));
        this.socket.on("userPrivateTyping", (data) => this.emit("userPrivateTyping", data));
        this.socket.on("userTyping", (data) => this.emit("userTyping", data));
        this.socket.on("userStatusChange", (data) => this.emit("userStatusChange", data));
        this.socket.on("newChat", (chat) => this.emit("newChat", chat));
        this.socket.on("chatCreated", (data) => this.emit("chatCreated", data));
        this.socket.on("userJoined", (data) => this.emit("userJoined", data));
        this.socket.on("userLeft", (data) => this.emit("userLeft", data));
        this.socket.on("userLeftPrivateChat", (data) => this.emit("userLeftPrivateChat", data));
        this.socket.on("newNotification", (notification) => this.emit("newNotification", notification));

        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("Timeout de connexion"));
          }
        }, 10000);
      } catch (error) {
        console.error("❌ Erreur d'initialisation:", error);
        reject(error);
      }
    });
  }

  markRoomRead(roomId: string, userId: string, lastReadMessageId: string) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("markRoomRead", { roomId, userId, lastReadMessageId });
  }

  async getRoomReadReceipts(roomId: string) {
    const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}/read-receipts`, { credentials: "include" });
    return res.json();
  }

  joinRoom(room: string, user: any) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.currentRoom = room;
    this.currentUser = user;
    this.socket.emit("joinRoom", { room, user });
  }

  joinPrivateChat(chatId: string, user: any) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    if (this.currentChatId && this.currentChatId !== chatId) {
      this.leavePrivateChat(this.currentChatId);
    }
    this.currentChatId = chatId;
    this.currentUser = user;
    this.socket.emit("joinPrivateChat", { chatId, user });
  }

  subscribeToRoom(roomId: string, user: any) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("subscribeToRoom", { roomId, user });
  }

  subscribeToPrivateChat(chatId: string) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("subscribeToPrivateChat", { chatId });
  }

  leavePrivateChat(chatId: string) {
    if (!this.socket || !this.isConnected) return;
    if (chatId) {
      this.socket.emit("leavePrivateChat", { chatId });
    }
    if (this.currentChatId === chatId) {
      this.currentChatId = null;
    }
  }

  toggleReaction(messageId: string, userId: string, emoji: string) {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    this.socket.emit("toggleReaction", { messageId, userId, emoji });
  }

  async sendPrivateMessage(
    content: string,
    chatId: string,
    user: any,
    options: { replyToMessageId?: string } = {}
  ): Promise<any> {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    if (!content || !chatId || !user) {
      throw new Error("Paramètres manquants pour envoyer le message");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de l'envoi du message"));
      }, 5000);

      const onMessageSent = (message: any) => {
        if (message.chatId === chatId && message.user._id === user._id) {
          clearTimeout(timeout);
          this.socket!.off("newPrivateMessage", onMessageSent);
          resolve(message);
        }
      };

      this.socket!.on("newPrivateMessage", onMessageSent);
      this.socket!.emit("sendPrivateMessage", {
        content: content.trim(),
        chatId,
        user,
        replyToMessageId: options.replyToMessageId ?? null,
      });
    });
  }
  async deleteMessage(messageId: string, userId: string): Promise<any> {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de la suppression du message"));
      }, 5000);

      const onDeleted = (data: any) => {
        if (data._id === messageId) {
          clearTimeout(timeout);
          this.socket!.off("messageDeleted", onDeleted);
          resolve(data);
        }
      };

      this.socket!.on("messageDeleted", onDeleted);
      this.socket!.emit("deleteMessage", { messageId, userId });
    });
  }

  async editMessage(messageId: string, userId: string, content: string): Promise<any> {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de la modification du message"));
      }, 5000);

      const onEdited = (data: any) => {
        if (String(data._id) === String(messageId)) {
          clearTimeout(timeout);
          this.socket!.off("messageEdited", onEdited);
          resolve(data);
        }
      };

      this.socket!.on("messageEdited", onEdited);
      this.socket!.emit("editMessage", { messageId, userId, content: content.trim() });
    });
  }

  async markAsRead(chatId: string, userId: string) {
    try {
      await fetch(`${SERVER_URL}/api/messages/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ chatId, userId }),
      });
    } catch (error) {
      console.error("❌ Erreur marquage en lu:", error);
    }
  }

  async sendMessage(content: string, room: string, user: any): Promise<any> {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de l'envoi du message"));
      }, 5000);

      const onMessageSent = (message: any) => {
        if (message.room === room && message.user._id === user._id) {
          clearTimeout(timeout);
          this.socket!.off("newMessage", onMessageSent);
          resolve(message);
        }
      };

      this.socket!.on("newMessage", onMessageSent);
      this.socket!.emit("sendMessage", { content: content.trim(), room, user });
    });
  }

  async createChat(user1: any, user2: any): Promise<any> {
    if (!this.socket || !this.isConnected) {
      throw new Error("Socket non connecté");
    }
    if (!user1 || !user2) {
      throw new Error("Les deux utilisateurs sont requis");
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout lors de la création du chat"));
      }, 10000);

      const onChatCreated = (data: any) => {
        clearTimeout(timeout);
        this.socket!.off("chatCreated", onChatCreated);
        this.socket!.off("error", onError);
        if (data.success) {
          resolve(data.chat);
        } else {
          reject(new Error("Échec de la création du chat"));
        }
      };

      const onError = (error: any) => {
        clearTimeout(timeout);
        this.socket!.off("chatCreated", onChatCreated);
        this.socket!.off("error", onError);
        reject(error);
      };

      this.socket!.on("chatCreated", onChatCreated);
      this.socket!.on("error", onError);
      this.socket!.emit("createChat", { user1, user2 });
    });
  }

  async getMessages(room: string | null = null, chatId: string | null = null, page = 1, limit = 50) {
    try {
      let url = `${SERVER_URL}/api/messages?page=${page}&limit=${limit}`;
      if (chatId) url += `&chatId=${chatId}`;
      else if (room) url += `&room=${room}`;

      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la récupération des messages");
      }
      return data;
    } catch (error) {
      console.error("❌ Erreur récupération messages:", error);
      throw error;
    }
  }


  async getUserChats(userId: string) {
    try {
      const response = await fetch(`${SERVER_URL}/api/chat/${userId}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la récupération des chats");
      }
      return data;
    } catch (error) {
      console.error("❌ Erreur récupération chats:", error);
      throw error;
    }
  }

  async getUsers() {
    try {
      const response = await fetch(`${SERVER_URL}/api/users`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erreur lors de la récupération des utilisateurs");
      }
      return data;
    } catch (error) {
      console.error("❌ Erreur récupération utilisateurs:", error);
      throw error;
    }
  }

  async deletePrivateMessage(chatId: string, messageId: string) {
    try {
      await fetch(`${SERVER_URL}/api/messages/${chatId}/${messageId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("❌ Erreur suppression message:", error);
    }
  }

  joinRoomChannel(roomId: string, user: any) {
    if (!this.socket || !this.isConnected) throw new Error("Socket non connecté");
    this.socket.emit("joinRoomChannel", { roomId, user });
  }

  leaveRoomChannel(roomId: string) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("leaveRoomChannel", { roomId });
  }

  async sendRoomMessage(
    content: string,
    roomId: string,
    user: any,
    options: { replyToMessageId?: string } = {}
  ): Promise<any> {
    if (!this.socket || !this.isConnected) throw new Error("Socket non connecté");

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timeout lors de l'envoi")), 5000);

      const onSent = (message: any) => {
        if (message.room === roomId && message.user._id === user._id) {
          clearTimeout(timeout);
          this.socket!.off("newRoomMessage", onSent);
          resolve(message);
        }
      };

      this.socket!.on("newRoomMessage", onSent);
      this.socket!.emit("sendRoomMessage", {
        content: content.trim(),
        roomId,
        user,
        replyToMessageId: options.replyToMessageId ?? null,
      });

      this.getRoomReadReceipts(roomId);
    });
  }

  sendRoomTyping(isTyping: boolean, roomId: string) {
    if (!this.socket || !this.isConnected) return;
    this.socket.emit("roomTyping", { roomId, isTyping });
  }

  inviteToRoom(roomId: string, userIds: string[], invitedBy: string) {
    if (!this.socket || !this.isConnected) throw new Error("Socket non connecté");
    this.socket.emit("inviteToRoom", { roomId, userIds, invitedBy });
  }

  promoteToAdmin(roomId: string, targetUserId: string, updatedBy: string) {
    if (!this.socket || !this.isConnected) throw new Error("Socket non connecté");
    this.socket.emit("promoteToAdmin", { roomId, targetUserId, updatedBy });
  }

  demoteToMember(roomId: string, targetUserId: string, updatedBy: string) {
    if (!this.socket || !this.isConnected) throw new Error("Socket non connecté");
    this.socket.emit("demoteToMember", { roomId, targetUserId, updatedBy });
  }

  updateRoom(roomId: string, updates: Partial<{ name: string; description: string; avatar: string }>, updatedBy: string) {
    if (!this.socket || !this.isConnected) throw new Error("Socket non connecté");
    this.socket.emit("updateRoom", { roomId, updates, updatedBy });
  }

  async getRoomMembers(roomId: string) {
    const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}/members`, { credentials: "include" });
    return res.json();
  }

  sendTyping(isTyping: boolean, chatId: string | null = null, room: string | null = null) {
    if (!this.socket || !this.isConnected) return;
    if (chatId) {
      this.socket.emit("privateTyping", { chatId, isTyping });
    } else if (room) {
      this.socket.emit("typing", { isTyping });
    }
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);

    return () => {
      this.eventListeners[event] = this.eventListeners[event].filter((cb) => cb !== callback);
    };
  }

  off(event: string, callback: EventCallback) {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter((cb) => cb !== callback);
    }
  }

  emit(event: string, data: any) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Erreur dans le callback ${event}:`, error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      if (this.currentChatId) {
        this.leavePrivateChat(this.currentChatId);
      }
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.currentChatId = null;
    this.currentRoom = null;
    this.currentUser = null;
    this.eventListeners = {};
    this.reconnectAttempts = 0;
  }

  isSocketConnected(): boolean {
    return !!this.socket?.connected && this.isConnected;
  }

  async reconnect() {
    if (this.socket) {
      this.disconnect();
    }
    try {
      await this.initialize();
      if (this.currentUser) {
        if (this.currentChatId) {
          this.joinPrivateChat(this.currentChatId, this.currentUser);
        } else if (this.currentRoom) {
          this.joinRoom(this.currentRoom, this.currentUser);
        }
      }
    } catch (error) {
      console.error("❌ Échec de la reconnexion:", error);
      throw error;
    }
  }

  getState() {
    return {
      isConnected: this.isConnected,
      currentChatId: this.currentChatId,
      currentRoom: this.currentRoom,
      currentUser: this.currentUser,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  getEventListeners() {
    return Object.keys(this.eventListeners).map((event) => ({
      event,
      listenerCount: this.eventListeners[event].length,
    }));
  }

  ping() {
    if (this.socket && this.isConnected) {
      const startTime = Date.now();
      this.socket.emit("ping", startTime);
      this.socket.once("pong", (timestamp: number) => {
        const latency = Date.now() - timestamp;
        this.emit("ping", { latency, timestamp });
      });
    }
  }
}

export default new ChatService();