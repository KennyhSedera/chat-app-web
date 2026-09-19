// export type MessageContentType = "text" | "image" | "audio" | "video" | "document";

// export type OtherUser = {
//   _id: string;
//   name: string;
//   avatar: string | null;
//   is_online: boolean;
//   last_seen: string;
// };

// export type Chat = {
//   chatId: string;
//   user1Id: string;
//   user2Id: string;
//   otherUser: OtherUser;
//   lastMessage: LastMessage | null;
//   lastMessageAt: string | null;
//   unreadCount: number;
//   createdAt: string;
// };

export type MessageType = "private" | "room" | string;

// export type ChatUser = {
//   _id: string;
//   name: string;
//   avatar?: string | null;
// };

// export type Reaction = {
//   emoji: string;
//   userId: string;
// };

// export type ReplyPreview = {
//   _id: string;
//   content: string;
//   contentType: MessageContentType;
//   fileUrl?: string | null;
//   fileName?: string | null;
//   thumbnailUrl?: string | null;
//   user?: { _id: string; name: string };
// };

// export type Message = {
//   _id: string;
//   content: string;
//   contentType: MessageContentType;
//   fileUrl?: string | null;
//   fileName?: string | null;
//   fileSize?: number | null;
//   fileMimeType?: string | null;
//   fileDuration?: number | null;
//   thumbnailUrl?: string | null;
//   user: ChatUser;
//   chatId: string | null;
//   room: string | null;
//   messageType: string;
//   isRead: boolean;
//   isEdited?: boolean;
//   replyTo?: ReplyPreview | null;
//   reactions?: Reaction[];
//   createdAt: string;
//   updatedAt?: string;
// };

// export type LastMessage = {
//   _id: string;
//   content: string;
//   contentType: MessageContentType;
//   is_read: boolean;
//   senderId: string;
// };

// export type ConversationType = 'private' | 'room';

export type PrivateConversation = {
  type: 'private';
  chatId: string;
  otherUser: OtherUser;
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
};

export type RoomConversation = {
  type: 'room';
  roomId: string;
  name: string;
  description: string | null;
  avatar: string | null;
  isPrivate: boolean;
  memberCount: number;
  myRole: 'owner' | 'admin' | 'member' | null;
  lastMessage: (LastMessage & { senderName?: string }) | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
};

// export type Conversation = PrivateConversation | RoomConversation;

// export function getConversationId(c: Conversation): string {
//   return c.type === 'private' ? c.chatId : c.roomId;
// }






export type MessageContentType = "text" | "image" | "audio" | "video" | "document";

export type Reaction = {
  emoji: string;
  userId: string;
};

export type ReplyPreview = {
  _id: string;
  content: string;
  contentType: MessageContentType;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  fileName?: string | null;
  user?: { _id: string; name: string };
};

export type ChatUser = {
  _id: string;
  name: string;
  avatar?: string | null;
};

export type Message = {
  _id: string;
  content: string;
  contentType: MessageContentType;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  fileDuration?: number | null;
  thumbnailUrl?: string | null;
  user: ChatUser;
  chatId: string | null;
  room: string | null;
  messageType: string;
  isRead: boolean;
  isEdited?: boolean;
  replyTo?: ReplyPreview | null;
  reactions?: Reaction[];
  createdAt: string;
  updatedAt?: string;
};

export type LastMessage = {
  _id: string;
  content: string;
  contentType: MessageContentType;
  senderId: string;
  senderName?: string;
  is_read: boolean;
};

export type OtherUser = {
  _id: string;
  name: string;
  avatar: string | null;
  is_online: boolean;
  last_seen: string;
};

// ── Chat privé ──────────────────────────────────────────────
export type Chat = {
  chatId: string;
  user1Id: string;
  user2Id: string;
  otherUser: OtherUser;
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
};

// ── Room ─────────────────────────────────────────────────────
export type RoomRole = "owner" | "admin" | "member";

export type Room = {
  roomId: string;
  name: string;
  description: string | null;
  avatar: string | null;
  createdBy: string;
  isPrivate: boolean;
  memberCount: number;
  myRole: RoomRole | null;
  lastMessage: LastMessage | null;
  lastMessageAt: string | null;
  unreadCount: number;
  createdAt: string;
};

export type RoomMember = {
  _id: string;
  name: string;
  avatar: string | null;
  is_online: boolean;
  last_seen: string;
  role: RoomRole;
  joinedAt: string;
};

export type RoomInvite = {
  roomId: string;
  name: string;
  description: string | null;
  avatar: string | null;
  isPrivate: boolean;
  invitedByName: string;
  invitedAt: string;
};

// ── Conversation unifiée (discriminée par "type") ─────────────
export type ConversationType = "private" | "room";

export type Conversation =
  | ({ type: "private" } & Chat)
  | ({ type: "room" } & Room);

export function getConversationId(c: Conversation): string {
  return c.type === "private" ? c.chatId : c.roomId;
}

export function getConversationName(c: Conversation): string {
  return c.type === "private" ? c.otherUser.name : c.name;
}

export function getConversationAvatar(c: Conversation): string | null {
  return c.type === "private" ? c.otherUser.avatar : c.avatar;
}