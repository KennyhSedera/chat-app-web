'use client';

import { ChatSidebar } from '@/app/dev/components/chat/ChatSidebar';
import { ChatWindow } from '@/app/dev/components/chat/ChatWindow';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ChatPage = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="h-screen flex-1 bg-[#05070A] p-2">
      <div className="grid h-full grid-cols-1 gap-2 md:grid-cols-4">

        {/* Sidebar */}
        <div
          className={`
            h-full overflow-hidden rounded-lg border border-[#1F242C] bg-[#0A0C10]
            md:col-span-1 md:block
            ${selectedChatId ? 'hidden md:block' : 'block'}
          `}
        >
          <ChatSidebar
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
          />
        </div>

        {/* Chat */}
        <div
          className={`
            h-full overflow-hidden rounded-lg border border-[#1F242C] bg-[#0A0C10]
            md:col-span-3
            ${selectedChatId ? 'block' : 'hidden md:block'}
          `}
        >
          {selectedChatId ? (
            <ChatWindow
              chatId={selectedChatId}
              onBack={() => setSelectedChatId(null)}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
              <p
                className="text-sm font-medium text-[#F5F6F7]"
                style={{
                  fontFamily: 'var(--font-space-grotesk, sans-serif)',
                }}
              >
                Sélectionnez une conversation
              </p>

              <p className="text-xs text-[#8B92A0]">
                Choisissez un contact dans la liste à gauche
              </p>
              <p className="text-xl text-[#8B92A0]">ou</p>
              <button onClick={() => router.push("/")} className="rounded-lg cursor-pointer bg-amber-300 px-4 py-2 text-xs text-black">Retourner au tableau de bord</button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ChatPage;