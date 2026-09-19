'use client';

import { ConversationSidebar } from '@/app/dev/components/chat/ConversationSidebar';
import { ConversationWindow } from '@/app/dev/components/chat/ConversationWindow';
import { ConversationType } from '@/app/dev/types/chat.types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const ChatPage = () => {
  const [selected, setSelected] = useState<{ id: string; type: ConversationType } | null>(null);
  const router = useRouter();

  return (

    <div className="h-screen flex-1 bg-[#05070A] p-2">
      <div className="grid h-full grid-cols-1 gap-2 md:grid-cols-4">

        {/* Sidebar */}
        <div
          className={`
            h-full overflow-hidden rounded-lg border border-[#1F242C] bg-[#0A0C10]
            md:col-span-1 md:block
            ${selected ? 'hidden md:block' : 'block'}
          `}
        >
          <ConversationSidebar
            selectedId={selected?.id ?? null}
            onSelect={(id, type) => setSelected({ id, type })}
          />
        </div>

        {/* Chat */}
        <div
          className={`
            h-full overflow-hidden rounded-lg border border-[#1F242C] bg-[#0A0C10]
            md:col-span-3
            ${selected ? 'block' : 'hidden md:block'}
          `}
        >
          {selected ? (
            <ConversationWindow conversationId={selected.id} type={selected.type} onBack={() => setSelected(null)} />
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