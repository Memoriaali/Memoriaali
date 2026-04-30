// ./metadataSuggestions/MetadataSuggestionsProvider.tsx
import { useMetadatasuggestions } from '@/hooks/useMetadatasuggestions';
import { MetadataSuggestionWithUser } from '@/lib/api/generated/types.gen';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type SuggestableField =
  | 'header'
  | 'subjectIndexing'
  | 'events'
  | 'locations'
  | 'description'
  | 'author'
  | 'exactDate'
  | 'estimatedDate'
  | 'type'
  | 'language'
  | 'personNames'
  | 'organizations'
  | 'businessIdentityCode'
  | 'journalNumber'
  | 'products'
  | 'nationalityReligiousPolitical'
  | 'other';

export const normalizeFieldKey = (key: string | null | undefined): string =>
  (key ?? '').trim().toLowerCase();

type Ctx = {
  suggestionsByField: Map<string, MetadataSuggestionWithUser[]>;
  refresh: () => Promise<void>;
};

const MetadataSuggestionsContext = createContext<Ctx | undefined>(undefined);

type ProviderProps = {
  documentId: string;
  children: React.ReactNode;
  /** When false, provider does not start fetching yet (lazy enable). Default: true. */
  enabled?: boolean;
};

/** ---- Session cache & in-flight dedupe (shared across all provider instances) ---- */
type CacheEntry = { items: MetadataSuggestionWithUser[] };
const suggestionsCache = new Map<string, CacheEntry>(); // key: documentId
const inflight = new Map<string, Promise<MetadataSuggestionWithUser[]>>(); // key: documentId

export const MetadataSuggestionsProvider: React.FC<ProviderProps> = ({
  documentId,
  children,
  enabled = true,
}) => {
  const { getApprovedSuggestionsForDocument } = useMetadatasuggestions();

  const [items, setItems] = useState<MetadataSuggestionWithUser[]>([]);

  const fetchOnce = useCallback(
    async (id: string): Promise<MetadataSuggestionWithUser[]> => {
      // Serve from session cache
      const cached = suggestionsCache.get(id);
      if (cached) return cached.items;

      // Dedupe in-flight
      const running = inflight.get(id);
      if (running) return running;

      const p = (async () => {
        const result = await getApprovedSuggestionsForDocument(id);
        const list = result?.metadataSuggestions ?? [];
        suggestionsCache.set(id, { items: list });
        return list;
      })();

      inflight.set(id, p);
      try {
        const list = await p;
        return list;
      } finally {
        inflight.delete(id);
      }
    },
    [getApprovedSuggestionsForDocument],
  );

  const load = useCallback(
    async (force = false) => {
      try {
        if (force) suggestionsCache.delete(documentId);
        const list = await fetchOnce(documentId);
        setItems(list);
      } catch (error) {
        if (typeof error === 'object' && error !== null && 'statusCode' in error) {
          const { statusCode } = error as { statusCode: number };
          // Keep it quiet in UI; just log here
          console.error('metadata suggestions load error', statusCode);
        } else {
          console.error('metadata suggestions load error', error);
        }
      }
    },
    [documentId, fetchOnce],
  );

  // Lazy: only load when enabled turns true (e.g., when visible)
  useEffect(() => {
    if (!enabled) return;
    void load(false);
  }, [enabled, load]);

  const suggestionsByField = useMemo(() => {
    const map = new Map<string, MetadataSuggestionWithUser[]>();
    for (const s of items) {
      const key = normalizeFieldKey(s.fieldToChange);
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [items]);

  const value = useMemo<Ctx>(
    () => ({
      suggestionsByField,
      refresh: async () => {
        await load(true); // force reload (used after user actions that change suggestions)
      },
    }),
    [suggestionsByField, load],
  );

  return (
    <MetadataSuggestionsContext.Provider value={value}>
      {children}
    </MetadataSuggestionsContext.Provider>
  );
};

export const useMetadataSuggestionsContext = (): Ctx => {
  const ctx = useContext(MetadataSuggestionsContext);
  if (!ctx) {
    throw new Error(
      'useMetadataSuggestionsContext must be used within a <MetadataSuggestionsProvider>',
    );
  }
  return ctx;
};
