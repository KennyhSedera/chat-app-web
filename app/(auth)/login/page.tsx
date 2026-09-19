'use client';

import { useState } from "react";
import { useAuth } from "@/app/dev/contexts/AuthContext";

export default function Login() {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (
    e: React.SubmitEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    setError(null);

    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs.");
      return;
    }

    try {
      const res = await login(email.trim(), password);

      console.log("Login response:", res);

      if (!res?.success) {
        setError(res?.error ?? "Email ou mot de passe incorrect.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Une erreur est survenue lors de la connexion.");
    }
  };

  return (
    <div>
      <form
        onSubmit={handleLogin}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-white p-6 shadow dark:bg-zinc-900"
      >
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Login
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border px-4 py-3 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border px-4 py-3 outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
        />

        {error && (
          <p className="text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-blue-600 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {isLoading ? "Connexion..." : "Login"}
        </button>
      </form>
    </div>
  );
}