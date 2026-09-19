'use client';

import { ChatWindow } from './ChatWindow';
import { ConversationType } from '../../types/chat.types';
import RoomChatBody from './RoomChatBody';

export function ConversationWindow({
  conversationId,
  type,
  onBack,
}: {
  conversationId: string;
  type: ConversationType;
  onBack: () => void;
}) {
  if (type === 'private') {
    return <ChatWindow chatId={conversationId} onBack={onBack} />;
  }
  return <RoomChatBody roomId={conversationId} onBack={onBack} />;
}