"use client";

import { useMemo, useState } from "react";

import tononkaloData from "@/app/dev/constants/tonokalo.json";
import type { Tononkalo } from "@/app/dev/types/poem.types";

const tononkalo = tononkaloData as Tononkalo[];

export default function TononkaloPage() {
  const [search, setSearch] = useState("");
  const [author, setAuthor] = useState("all");

  const authors = useMemo(() => {
    return [...new Set(tononkalo.map((item) => item.author))].sort();
  }, []);

  const filteredTononkalo = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tononkalo.filter((item) => {
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.author.toLowerCase().includes(query);

      const matchesAuthor =
        author === "all" || item.author === author;

      return matchesSearch && matchesAuthor;
    });
  }, [search, author]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Tononkalo Malagasy
          </h1>

          <p className="mt-2 text-sm text-zinc-400">
            Vakio an-tserasera ireo tononkalo Malagasy
          </p>
        </div>

        {/* Search + filter */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">

          <div className="relative flex-1">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Mitadiava tononkalo na mpanoratra..."
              className="
                w-full rounded-xl
                border border-zinc-800
                bg-zinc-900
                px-4 py-3
                text-sm text-white
                outline-none
                placeholder:text-zinc-500
                focus:border-zinc-600
              "
            />
          </div>

          <select
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="
              rounded-xl
              border border-zinc-800
              bg-zinc-900
              px-4 py-3
              text-sm text-white
              outline-none
            "
          >
            <option value="all">
              Mpanoratra rehetra
            </option>

            {authors.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {/* Result count */}
        <div className="mb-4 text-sm text-zinc-500">
          {filteredTononkalo.length} tononkalo
        </div>

        {/* Grid */}
        {filteredTononkalo.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTononkalo.map((item) => (
              <article
                key={item.id}
                className="
                  group rounded-2xl
                  border border-zinc-800
                  bg-zinc-900
                  p-5
                  transition
                  hover:border-zinc-700
                  hover:bg-zinc-800/80
                "
              >
                <div className="flex min-h-[160px] flex-col">

                  {/* Title */}
                  <div className="flex-1">
                    <h2 className="
                      text-lg
                      font-semibold
                      leading-snug
                      text-white
                      group-hover:text-zinc-200
                    ">
                      {item.title}
                    </h2>

                    <p className="mt-3 text-sm text-zinc-400">
                      {item.author}
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Source : {item.source}
                    </p>
                  </div>

                  {/* Read button */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="
                      mt-5
                      inline-flex
                      items-center
                      justify-center
                      rounded-xl
                      bg-white
                      px-4
                      py-2.5
                      text-sm
                      font-medium
                      text-zinc-950
                      transition
                      hover:bg-zinc-200
                    "
                  >
                    Vakio ny tononkalo
                    <span className="ml-2">↗</span>
                  </a>

                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="
            rounded-2xl
            border border-zinc-800
            bg-zinc-900
            px-6 py-16
            text-center
          ">
            <p className="text-lg font-medium">
              Tsy nahitana tononkalo
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Andramo teny fikarohana hafa.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}