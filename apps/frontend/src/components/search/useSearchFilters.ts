import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export const useSearchFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const parseSearchParam = (param: string) => {
    if (!param) {
      return {
        searchTerm: '',
        types: [],
        languages: [],
        authors: [],
        locations: [],
        subjectIndex: [],
      };
    }

    const bracketIdx = param.indexOf('[');
    const searchTerm = bracketIdx !== -1 ? param.slice(0, bracketIdx).trim() : param.trim();
    const filtersBlock =
      bracketIdx !== -1 ? param.slice(bracketIdx + 1, param.indexOf(']', bracketIdx)) : '';

    const filtersArr = filtersBlock
      ? filtersBlock
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean)
      : [];

    // Parse filters into groups
    const types: string[] = [];
    const languages: string[] = [];
    const authors: string[] = [];
    const locations: string[] = [];
    const subjectIndex: string[] = [];
    let startDate: string | undefined = undefined;
    let endDate: string | undefined = undefined;

    for (const item of filtersArr) {
      if (item.startsWith('type.')) types.push(item.slice(5));
      else if (item.startsWith('language.')) languages.push(item.slice(9));
      else if (item.startsWith('author.')) authors.push(item.slice(7));
      else if (item.startsWith('locations.')) locations.push(item.slice(10));
      else if (item.startsWith('subjectIndexing.')) subjectIndex.push(item.slice(16));
      else if (item.startsWith('exactDate.')) {
        const [start, end_] = item.slice(10).split(':');
        startDate = start ?? undefined;
        endDate = end_ ?? undefined;
      }
    }

    return {
      searchTerm,
      types,
      languages,
      authors,
      locations,
      subjectIndex,
      startDate,
      endDate,
    };
  };

  const initialParsedRefFromUrl = useRef(
    parseSearchParam((searchParams.get('search') ?? '').trim()),
  );

  const [searchTerm, setSearchTerm] = useState<string>(initialParsedRefFromUrl.current.searchTerm);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedSubjectIndex, setSelectedSubjectIndex] = useState<string[]>([]);
  const [_startDate, setStartDate] = useState<Date | null>(null);
  const [_endDate, setEndDate] = useState<Date | null>(null);

  // Build search parameter with selected types (if any)
  const buildSearchParam = (
    searchTerm: string,
    types: string[],
    languages: string[],
    authors: string[],
    locations: string[],
    subjectIndex: string[],
    _startDate?: Date | null,
    _endDate?: Date | null,
  ) => {
    // Collect all filters as [type.book, ...] strings
    const filters: string[] = [];

    if (types.length > 0) filters.push(...types.map((t) => `type.${t}`));
    if (languages.length > 0) filters.push(...languages.map((l) => `language.${l}`));
    if (authors.length > 0) filters.push(...authors.map((a) => `author.${a}`));
    if (locations.length > 0) filters.push(...locations.map((loc) => `locations.${loc}`));
    if (subjectIndex.length > 0)
      filters.push(...subjectIndex.map((subj) => `subjectIndexing.${subj}`));

    // Date filter as one part like exactDate.2023-09-01:2023-09-30
    if (_startDate || _endDate) {
      const start = _startDate ? _startDate.toISOString().split('T')[0] : '';
      const end = _endDate ? _endDate.toISOString().split('T')[0] : '';
      filters.push(`exactDate.${start}:${end}`);
    }

    // Combine with commas and wrap in brackets if there are any filters
    const bracketedFilters = filters.length > 0 ? `[${filters.join(',')}]` : '';
    return searchTerm ? `${searchTerm} ${bracketedFilters}`.trim() : bracketedFilters;
  };

  function handleCheckboxToggle(
    event: React.ChangeEvent<HTMLInputElement>,
    filterType: 'languages' | 'types' | 'authors' | 'locations' | 'subjectIndex',
  ) {
    const { value, checked } = event.target;

    // Setters and update for each filter type
    // UseEffect handles updating the URL params upon state change

    const filterSetters = {
      authors: setSelectedAuthors,
      languages: setSelectedLanguages,
      types: setSelectedTypes,
      locations: setSelectedLocations,
      subjectIndex: setSelectedSubjectIndex,
    };

    const setter = filterSetters[filterType];
    if (setter) {
      setter((prev) => (checked ? [...prev, value] : prev.filter((item) => item !== value)));
    }
  }

  const handleDateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const date: Date | null = value ? new Date(value) : null;

    let newStartDate = _startDate;
    let newEndDate = _endDate;

    if (name === 'startDate') {
      newStartDate = date;
      setStartDate(newStartDate);

      // If the end date is not set, set it to this date
      if (!newEndDate && date) {
        newEndDate = new Date();
        setEndDate(new Date());
      }
    } else if (name === 'endDate') {
      newEndDate = date;
      setEndDate(date);
    }
  };

  // Clearing all the selections
  const clearSelection = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedTypes([]);
    setSelectedLanguages([]);
    setSelectedAuthors([]);
    setSelectedLocations([]);
    setSelectedSubjectIndex([]);
  };

  useEffect(() => {
    const newSearch = buildSearchParam(
      searchTerm,
      selectedTypes,
      selectedLanguages,
      selectedAuthors,
      selectedLocations,
      selectedSubjectIndex,
      _startDate,
      _endDate,
    );

    const currentSearch = (searchParams.get('search') ?? '').trim();
    const nextSearch = (newSearch ?? '').trim();

    if (currentSearch === nextSearch) return;

    const params = new URLSearchParams(searchParams.toString());

    params.set('search', nextSearch);
    params.set('page', '1');

    router.replace(`${pathname}?${params.toString()}`);
    // TODO: This was a quick fix, check later
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchTerm,
    selectedTypes,
    selectedLanguages,
    selectedAuthors,
    selectedLocations,
    selectedSubjectIndex,
    _startDate,
    _endDate,
    pathname,
    router,
  ]);

  // On mount or when search param changes, parse and set states
  // Makes sure the page reflects URL params, e.g. when navigating back, refreshing or sharing links
  useEffect(() => {
    const parsed = parseSearchParam(searchParams.get('search') ?? '');

    setSearchTerm(parsed.searchTerm);
    setSelectedTypes(parsed.types);
    setSelectedLanguages(parsed.languages);
    setSelectedAuthors(parsed.authors);
    setSelectedLocations(parsed.locations);
    setSelectedSubjectIndex(parsed.subjectIndex);
    setStartDate(parsed.startDate ? new Date(parsed.startDate) : null);
    setEndDate(parsed.endDate ? new Date(parsed.endDate) : null);
  }, [searchParams]);

  return {
    searchTerm,
    setSearchTerm,
    selectedTypes,
    selectedLanguages,
    selectedAuthors,
    selectedLocations,
    selectedSubjectIndex,
    _startDate,
    _endDate,
    setStartDate,
    setEndDate,
    parseSearchParam,
    buildSearchParam,
    handleCheckboxToggle,
    clearSelection,
    handleDateInputChange,
  };
};
