"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Navigation } from "@/components/navigation";
import { DuaGrid } from "@/components/dua-card";
import { SearchBar } from "@/components/search-bar";
import { TagFilter } from "@/components/tag-filter";
import { createDuaSearcher, queryDuaSearcher } from "@/lib/search";
import { GraduationCap, Loader2 } from "lucide-react";
import Link from "next/link";
import type { Dua } from "@/lib/supabase";

export default function LibraryPage() {
  const [duas, setDuas] = useState<Dua[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [dueCount, setDueCount] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [allDuasForSearch, setAllDuasForSearch] = useState<Dua[]>([]);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Fetch initial duas
  useEffect(() => {
    const fetchDuas = async () => {
      try {
        const response = await fetch("/api/duas?limit=20");
        if (response.ok) {
          const data = await response.json();
          setDuas(data.duas);
          setNextOffset(data.nextOffset);
          setHasMore(data.hasMore);
        }
      } catch (error) {
        console.error("Failed to fetch duas:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDuas();
  }, []);

  // Fetch total count
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await fetch("/api/duas/count");
        if (response.ok) {
          const data = await response.json();
          setTotalCount(data.count);
        }
      } catch (error) {
        console.error("Failed to fetch count:", error);
      }
    };

    fetchCount();
  }, []);

  // Debounce the query that actually drives search execution, separate
  // from the raw input value (which updates immediately for typing feedback).
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 175);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all duas when search query changes (for client-side search)
  useEffect(() => {
    if (searchQuery.trim() && allDuasForSearch.length === 0) {
      const fetchAllForSearch = async () => {
        try {
          const response = await fetch("/api/duas?all=true");
          if (response.ok) {
            const data = await response.json();
            setAllDuasForSearch(data.duas);
          }
        } catch (error) {
          console.error("Failed to fetch all duas for search:", error);
        }
      };
      fetchAllForSearch();
    }
  }, [searchQuery, allDuasForSearch.length]);

  // Load more duas
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || nextOffset === null || searchQuery.trim())
      return;

    setIsLoadingMore(true);
    try {
      const response = await fetch(`/api/duas?offset=${nextOffset}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        // Deduplicate - filter out any duas that already exist
        setDuas((prev) => {
          const existingIds = new Set(prev.map((d) => d.id));
          const newDuas = data.duas.filter(
            (d: { id: string }) => !existingIds.has(d.id)
          );
          return [...prev, ...newDuas];
        });
        setNextOffset(data.nextOffset);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Failed to load more duas:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, nextOffset, searchQuery]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !searchQuery.trim()) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadMore, hasMore, searchQuery]);

  // Fetch due count for practice. Named/stable so it can also be called
  // explicitly from handleDelete — the one other place due-ness can
  // actually change — instead of keying an effect on `duas` wholesale
  // (which would also (mis)fire on loadMore, which never affects due-ness).
  const fetchDueCount = useCallback(async () => {
    try {
      const response = await fetch("/api/duas/practice");
      if (response.ok) {
        const data = await response.json();
        setDueCount(data.length);
      }
    } catch (error) {
      console.error("Failed to fetch due count:", error);
    }
  }, []);

  useEffect(() => {
    fetchDueCount();
  }, [fetchDueCount]);

  // Tag-filtered pool — the stable base that both display and search work
  // from. Its own useMemo so the Fuse index below only rebuilds when this
  // actually changes, not on every keystroke.
  const searchPool = useMemo(() => {
    const pool = allDuasForSearch.length > 0 ? allDuasForSearch : duas;
    return selectedTag
      ? pool.filter((dua) => dua.tags?.some((tag) => tag.name === selectedTag))
      : pool;
  }, [duas, selectedTag, allDuasForSearch]);

  // The expensive step (building the Fuse index) — memoized on searchPool,
  // so it survives keystrokes. Only queryDuaSearcher runs per keystroke.
  const fuse = useMemo(() => createDuaSearcher(searchPool), [searchPool]);

  const filteredDuas = useMemo(() => {
    if (!debouncedQuery.trim()) return searchPool;
    return queryDuaSearcher(fuse, debouncedQuery);
  }, [searchPool, fuse, debouncedQuery]);

  const handleDelete = (id: string) => {
    setDuas((prev) => prev.filter((dua) => dua.id !== id));
    setAllDuasForSearch((prev) => prev.filter((dua) => dua.id !== id));
    setTotalCount((prev) => prev - 1);
    fetchDueCount();
  };

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* Main Content */}
      <main className="pt-20 pb-28 md:pb-8 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Your Duas</h1>
            <p className="text-muted-foreground">
              {totalCount === 0
                ? "Start building your collection"
                : `${totalCount} dua${
                    totalCount !== 1 ? "s" : ""
                  } in your collection`}
            </p>
          </div>

          {/* Practice Banner */}
          {dueCount > 0 && (
            <Link
              href="/practice"
              className="block mb-6 p-4 rounded-2xl border border-primary/20 bg-primary/10/70 backdrop-blur-md  hover:bg-primary/20/80 transition-colors shadow-md shadow-primary/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">
                    {dueCount} dua{dueCount !== 1 ? "s" : ""} ready to practice
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Strengthen your memorization with spaced repetition
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Search + Tags - Sticky */}
          {totalCount > 0 && (
            <div
              className="sticky top-16 z-30 mb-6 bg-background/80/90 backdrop-blur-md border border-border/40 rounded-2xl px-4 py-3 shadow-md shadow-black/5"
              style={{ marginTop: "-1rem" }}
            >
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
              />
              {searchQuery && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Found {filteredDuas.length} result
                  {filteredDuas.length !== 1 ? "s" : ""} for &quot;{searchQuery}
                  &quot;
                </p>
              )}
              <div className="mt-3">
                <TagFilter
                  selectedTag={selectedTag}
                  onTagChange={setSelectedTag}
                />
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-2xl p-4 shadow-md shadow-primary/5 animate-pulse"
                >
                  <div className="h-6 bg-muted rounded w-3/4 mb-4" />
                  <div className="h-20 bg-muted rounded mb-4" />
                  <div className="h-4 bg-muted rounded w-full mb-2" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <DuaGrid duas={filteredDuas} onDelete={handleDelete} />

              {/* Infinite scroll trigger */}
              {!searchQuery.trim() && hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  {isLoadingMore && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading more duas...</span>
                    </div>
                  )}
                </div>
              )}

              {/* End of list indicator */}
              {!searchQuery.trim() && !hasMore && duas.length > 0 && (
                <p className="text-center text-muted-foreground py-8">
                  You&apos;ve reached the end of your collection
                </p>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
