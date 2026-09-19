'use client';

import Link from "next/link";
import { useAuth } from "../dev/contexts/AuthContext";

export default function Home() {
  const { user, logout, isLoading } = useAuth();

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#05070A] px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[#1F242C] bg-[#0A0C10] p-6 shadow-2xl">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[#8B92A0]">
              Chat App
            </p>

            <h1 className="mt-1 text-2xl font-semibold text-[#F5F6F7]">
              Tableau de bord
            </h1>
          </div>

          {!isLoading && user && (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-300 font-semibold text-black">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* User information */}
        <div className="mb-6 rounded-xl border border-[#1F242C] bg-[#11141A] p-5">
          {isLoading ? (
            <p className="text-sm text-[#8B92A0]">
              Chargement de votre profil...
            </p>
          ) : user ? (
            <>
              <p className="text-sm text-[#8B92A0]">
                Bienvenue 👋
              </p>

              <h2 className="mt-1 text-xl font-medium text-[#F5F6F7]">
                Bonjour {user.name}
              </h2>

              <p className="mt-1 text-sm text-[#8B92A0]">
                {user.email}
              </p>
            </>
          ) : (
            <p className="text-sm text-red-400">
              Utilisateur non connecté
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="grid gap-3 sm:grid-cols-2">

          <Link
            href="/conversation"
            className="group rounded-xl border border-[#1F242C] bg-[#11141A] p-5 transition hover:border-amber-300/50 hover:bg-[#151820]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 text-black">
              💬
            </div>

            <h3 className="font-medium text-[#F5F6F7]">
              Mes conversations
            </h3>

            <p className="mt-1 text-sm text-[#8B92A0]">
              Accéder à vos conversations et envoyer des messages.
            </p>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="rounded-xl border border-[#1F242C] bg-[#11141A] p-5 text-left transition hover:border-red-400/50 hover:bg-[#151820]"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              ↪
            </div>

            <h3 className="font-medium text-[#F5F6F7]">
              Déconnexion
            </h3>

            <p className="mt-1 text-sm text-[#8B92A0]">
              Fermer votre session sur cet appareil.
            </p>
          </button>

        </div>

      </div>
    </main>
  );
}