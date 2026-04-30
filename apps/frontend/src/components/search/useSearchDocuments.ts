import { useDocuments } from '@/hooks/useDocuments';
import { Document as DocumentType } from '@/lib/api/generated/types.gen';
import { useCallback, useEffect, useState } from 'react';

// Hook for searching documents with filters and pagination

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface UseSearchDocumentsParams {
  search: string;
  page: number;
  limit: number;
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
  startDate: Date | null;
  endDate: Date | null;
  selectedLocations?: string[];
  selectedAuthors?: string[];
  selectedTypes?: string[];
  selectedLanguages?: string[];
  selectedSubjectIndex?: string[];
}

export const useSearchDocuments = ({
  search,
  page,
  limit,
  sortOrder,
  searchTerm,
  startDate,
  endDate,
}: UseSearchDocumentsParams) => {
  const { getDocuments } = useDocuments();

  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({});

  // Filter options (all available authors, locations, subjects from all docs)
  const [authors, setAuthors] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [subjectIndex, setSubjectIndex] = useState<string[]>([]);

  // Format document for display
  const formatDocument = useCallback(
    (doc: DocumentType): DocumentType => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        exactDate: doc.metadata?.exactDate
          ? new Date(doc.metadata.exactDate).toLocaleDateString('fi-FI')
          : undefined,
      },
    }),
    [],
  );

  // Search for documents based on the query string
  const searchDocuments = useCallback(async () => {
    const query = {
      page,
      limit,
      sortOrder,
      ...(search.trim() !== '' && { search: search.trim() }),
    };

    // Get result documents for display (with pagination)
    const result = await getDocuments(query);

    // Get result for documents per type (without pagination)
    const typeCountsResult = await getDocuments({
      sortOrder,
      noLimit: true,
      ...(searchTerm !== '' && { search: searchTerm }),
    });

    const allDocs = typeCountsResult.data?.data?.documents ?? [];

    // Build date strings if filters are set
    const startDateString = startDate ? startDate.toISOString().slice(0, 10) : null;
    const endDateString = endDate ? endDate.toISOString().slice(0, 10) : null;

    // Conditionally apply date filtering
    // TODO: Add other filters to count as well (locations, authors, types, languages, subjectIndex), currently only date filtering is applied
    const docsToCount =
      startDateString || endDateString
        ? allDocs.filter((d) => {
            const docDate = d.metadata?.exactDate;
            if (!docDate) return false;
            const inStart = startDateString ? docDate >= startDateString : true;
            const inEnd = endDateString ? docDate <= endDateString : true;
            return inStart && inEnd;
          })
        : allDocs;

    const counts = docsToCount.reduce(
      (acc, d) => {
        const t = d.metadata?.type;
        if (!t) return acc;
        acc[t] = (acc[t] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    setTypeCounts(counts);

    if (result) {
      const data = result.data?.data;
      const docs = data?.documents ?? [];

      setPagination({
        total: data?.pagination?.total ?? 0,
        page: data?.pagination?.page ?? 1,
        limit: data?.pagination?.limit ?? 10,
        pages: data?.pagination?.pages ?? 0,
        hasNext: data?.pagination?.hasNext ?? false,
        hasPrev: data?.pagination?.hasPrev ?? false,
      });

      setDocuments(docs.map(formatDocument));
    }
  }, [
    page,
    limit,
    sortOrder,
    search,
    searchTerm,
    startDate,
    endDate,
    getDocuments,
    formatDocument,
  ]);

  // Fetch documents whenever search parameters change
  useEffect(() => {
    searchDocuments().catch(console.error);
  }, [searchDocuments]);

  // Fetch all filter options once on mount
  // Filter out empty values and duplicates
  useEffect(() => {
    (async () => {
      const result = await getDocuments({ noLimit: true });
      const docs = result?.data?.data?.documents ?? [];

      setAuthors(
        Array.from(
          new Set(
            docs
              .map((d) => d.metadata?.author ?? [])
              .flat()
              .map((a) => a.trim())
              .filter((a) => a.length > 0),
          ),
        ),
      );
      setLocations(
        Array.from(
          new Set(
            docs
              .map((d) => d.metadata?.locations ?? [])
              .flat()
              .map((loc) => loc.trim())
              .filter((loc) => loc.length > 0),
          ),
        ),
      );
      setSubjectIndex(
        Array.from(
          new Set(
            docs
              .map((d) => d.metadata?.subjectIndexing ?? [])
              .flat()
              .map((subj) => subj.trim())
              .filter((subj) => subj.length > 0),
          ),
        ),
      );
    })().catch(console.error);
  }, [getDocuments]);

  return {
    documents,
    pagination,
    typeCounts,
    authors,
    locations,
    subjectIndex,
  };
};
