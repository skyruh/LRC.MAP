"use client"

import { useState, useEffect, useRef, useCallback } from 'react';
import SearchBox from '@/components/SearchBox';
import LibraryMap from '@/components/LibraryMap';
import SearchResultsGrid from '@/components/SearchResultsGrid';
import { supabase } from '@/lib/supabase';

type Book = {
  id: string;
  title: string;
  author: string;
  call_number: string;
};

type ViewState = 'home' | 'list' | 'detail';

const SHELF_RANGES = [
  { id: '1', min: 1.4, max: 4.6, wing: 'CSE' },
  { id: '2', min: 4.6, max: 5.133, wing: 'CSE' },
  { id: '3', min: 5.133, max: 5.43, wing: 'CSE' },
  { id: '4', min: 5.43, max: 5.73, wing: 'CSE' },
  { id: '5', min: 5.73, max: 5.74, wing: 'CSE' },
  { id: '6', min: 5.74, max: 6.3, wing: 'CSE' },
  { id: '7', min: 6.3, max: 6.31, wing: 'CSE' },
  { id: '8', min: 6.31, max: 6.78, wing: 'CSE' },
  { id: '9', min: 6.78, max: 510.76, wing: 'CSE' },
  { id: '10', min: 510.76, max: 512.7, wing: 'CSE' },
  { id: '11', min: 512.7, max: 515.5, wing: 'CSE' },
  { id: '12', min: 515.5, max: 519.5, wing: 'CSE' },
  { id: '13', min: 519.5, max: 530.13, wing: 'CSE' },
  { id: '14', min: 530.13, max: 536.2, wing: 'CSE' },
  { id: '15', min: 536.2, max: 547.7, wing: 'CSE' },
  { id: '16', min: 547.7, max: 572.8, wing: 'CSE' },
  { id: '17', min: 572.8, max: 579, wing: 'CSE' },
  { id: '18', min: 579, max: 615.5, wing: 'CSE' },
  { id: '19', min: 615.5303, max: 669.9, wing: 'CSE' },
  { id: '20', min: 620, max: 621.3815, wing: 'ECE' },
  { id: '21', min: 621.3815, max: 621.38225, wing: 'ECE' },
  { id: '22', min: 621.38225, max: 954, wing: 'ECE' },
  { id: '23', min: 25.04, max: 338.5, wing: 'ECE' },
  { id: '24', min: 338.5, max: 658, wing: 'ECE' },
  { id: '25', min: 658, max: 658.4033, wing: 'ECE' },
  { id: '26', min: 658.4034, max: 659.2, wing: 'ECE' },
] as const;

export default function Home() {
  const [view, setView] = useState<ViewState>('home');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [activeWing, setActiveWing] = useState<'CSE' | 'ECE'>('CSE');
  const [highlightedShelf, setHighlightedShelf] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [currentQuery, setCurrentQuery] = useState('');
  const [mappingConfidence, setMappingConfidence] = useState<'high' | 'low'>('high');
  const observerTarget = useRef<HTMLDivElement>(null);

  const BATCH_SIZE = 40; // Increased for better fill

  const handlePinpointBook = (book: Book) => {
    const callNum = (book.call_number || '').trim();
    const match = callNum.match(/(\d+(\.\d+)?)/);
    const numericPart = match ? parseFloat(match[0]) : null;

    let wing: 'CSE' | 'ECE' = 'CSE';
    let shelfId = '1';

    if (numericPart !== null && numericPart < 1000) {
      // 1. Determine Preferred Wing by Subject
      const searchSpace = (book.title + ' ' + callNum).toLowerCase();

      const isECEHint = searchSpace.includes('elec') ||
        searchSpace.includes('signal') ||
        searchSpace.includes('circuit') ||
        searchSpace.includes('commu') ||
        searchSpace.includes('vlsi') ||
        searchSpace.includes('antenna') ||
        searchSpace.includes('microw');

      const isCSEHint = searchSpace.includes('comp') ||
        searchSpace.includes('math') ||
        searchSpace.includes('algor') ||
        searchSpace.includes('softw') ||
        searchSpace.includes('prog') ||
        searchSpace.includes('data') ||
        searchSpace.includes('calculus');

      let wing: 'CSE' | 'ECE' = 'CSE';
      let shelfId = '1';

      // 2. Strict Wing Strategy
      let candidateShelves = [...SHELF_RANGES];

      if (isECEHint && !isCSEHint) {
        candidateShelves = candidateShelves.filter(r => r.wing === 'ECE');
      } else if (isCSEHint && !isECEHint) {
        candidateShelves = candidateShelves.filter(r => r.wing === 'CSE');
      } else {
        // Tie-break: Default to CSE for macro-ranges (23, 24) to avoid overlap theft
        // unless the numeric part is in the ECE-exclusive 620s
        const isECEExclusive = numericPart >= 620 && numericPart <= 621.4;
        candidateShelves = candidateShelves.filter(r => isECEExclusive ? r.wing === 'ECE' : r.wing === 'CSE');
      }

      const matches = candidateShelves.filter(r => numericPart >= r.min && numericPart <= r.max);

      if (matches.length > 0) {
        // Resolve Overlaps: Prioritize shelf ENDS, then narrowest
        const bestMatch = matches.reduce((prev, curr) => {
          if (Math.abs(numericPart - curr.max) < 0.0001) return curr;
          if (Math.abs(numericPart - prev.max) < 0.0001) return prev;
          return (curr.max - curr.min) < (prev.max - prev.min) ? curr : prev;
        });

        shelfId = bestMatch.id;
        wing = bestMatch.wing as 'CSE' | 'ECE';
        setMappingConfidence('high');
      } else {
        // Fallback: Closest shelf in the wing
        const candidateShelvesFinal = candidateShelves.length > 0 ? candidateShelves : [...SHELF_RANGES];
        const closest = candidateShelvesFinal.reduce((prev, curr) => {
          const prevDist = Math.min(Math.abs(numericPart - prev.min), Math.abs(numericPart - prev.max));
          const currDist = Math.min(Math.abs(numericPart - curr.min), Math.abs(numericPart - curr.max));
          return currDist < prevDist ? curr : prev;
        });
        shelfId = closest.id;
        wing = closest.wing as 'CSE' | 'ECE';
        setMappingConfidence('low');
      }

      setActiveWing(wing);
      setHighlightedShelf(shelfId);
    } else {
      setMappingConfidence('high'); // Reset on missing data to avoid sticky warnings
    }
  };

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    handlePinpointBook(book);
    setView('detail');
  };

  // Simple SWR-style cache for repeated queries
  const [searchCache] = useState<Map<string, { results: Book[], hasMore: boolean }>>(new Map());

  const handleFullSearch = async (query: string) => {
    // 1. Check Cache First
    if (searchCache.has(query)) {
      const cached = searchCache.get(query)!;
      setSearchResults(cached.results);
      setHasMore(cached.hasMore);
      setCurrentQuery(query);
      setOffset(0);
      setView('list');
      return;
    }

    setLoading(true);
    setView('list');
    setOffset(0);
    setHasMore(true);
    setCurrentQuery(query);

    const { data, error } = await supabase
      .rpc('fuzzy_search_books', {
        query_text: query,
        limit_val: BATCH_SIZE,
        offset_val: 0
      });

    if (error) {
      console.error('Search error:', error);
    } else if (data) {
      const formatted = data.map((b: any) => ({
        id: String(b.biblionumber),
        title: b.title,
        author: b.authors || 'Unknown Author',
        call_number: b.call_number || 'No Call No.'
      }));
      setSearchResults(formatted);
      const more = formatted.length >= BATCH_SIZE;
      setHasMore(more);

      // 2. Save to Cache
      searchCache.set(query, { results: formatted, hasMore: more });
    }
    setLoading(false);
  };

  const fetchMore = useCallback(async () => {
    if (isFetchingMore || !hasMore || !currentQuery) return;

    setIsFetchingMore(true);
    const nextOffset = offset + BATCH_SIZE;

    const { data, error } = await supabase
      .rpc('fuzzy_search_books', {
        query_text: currentQuery,
        limit_val: BATCH_SIZE,
        offset_val: nextOffset
      });

    if (error) {
      console.error('Fetch more error:', error);
    } else if (data) {
      const formatted = data.map((b: any) => ({
        id: String(b.biblionumber),
        title: b.title,
        author: b.authors || 'Unknown Author',
        call_number: b.call_number || 'No Call No.'
      }));

      if (formatted.length > 0) {
        setSearchResults(prev => {
          const existingIds = new Set(prev.map((book: Book) => book.id));
          const uniqueNew = formatted.filter((book: Book) => !existingIds.has(book.id));
          return [...prev, ...uniqueNew];
        });
        setOffset(nextOffset);
      }

      if (formatted.length < BATCH_SIZE) {
        setHasMore(false);
      }
    }
    setIsFetchingMore(false);
  }, [isFetchingMore, hasMore, currentQuery, offset]);

  useEffect(() => {
    if (!hasMore || view !== 'list') return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchMore();
      }
    }, { threshold: 0.1 });

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [fetchMore, hasMore, view]);

  const handleBack = () => {
    if (view === 'detail') {
      setView(searchResults.length > 0 ? 'list' : 'home');
      setSelectedBook(null);
      // No state clearing here ensures "Back" to list is instant
    } else if (view === 'list') {
      setView('home');
      // We keep searchResults in state so if they search again 
      // or go back to list, it's already there
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center p-4 sm:p-24 bg-black text-white">
      {/* Dynamic Background Glow */}
      <div
        className={`fixed left-1/2 -translate-x-1/2 rounded-full blur-[160px] pointer-events-none transition-all duration-1000 ease-in-out bg-white/5 
          ${view === 'detail' ? 'w-[600px] h-[600px] top-0' : 'w-[1000px] h-[1000px] top-1/2 -translate-y-1/2'}`}
      />

      {/* Header / Title - Visible mainly on Home */}
      <div className={`absolute top-24 left-0 right-0 text-center z-10 transition-all duration-700 ${view === 'home' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        <h1 className="text-6xl font-black tracking-tighter text-white mb-2 uppercase">
          LRC<span className="text-neutral-500">.</span>MAP
        </h1>
        <p className="text-neutral-500 uppercase tracking-widest text-[10px] font-bold">
          JIIT Learning Resource Centre • ABB-III
        </p>
      </div>

      {/* Navigation Layer */}
      {view !== 'home' && (
        <div className="fixed top-8 left-8 right-8 flex justify-between items-center z-50 animate-in fade-in slide-in-from-top-4 duration-500 pointer-events-none">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 group text-neutral-500 hover:text-white transition-colors pointer-events-auto"
          >
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/30 transition-all bg-black/50 backdrop-blur-md">
              <svg className="w-4 h-4 text-white/50 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </div>
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-white/30 group-hover:text-white">Back</span>
          </button>

          <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto">
            {view === 'list' ? `Results • ${searchResults.length}` : 'Location Pinpoint'}
          </div>
        </div>
      )}

      {/* Search Bar - Persistent and repositioning */}
      <div className={`w-full max-w-xl transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] z-40 ${view === 'home' ? 'mt-[30vh]' : 'mt-4'}`}>
        <SearchBox onSelect={handleSelectBook} onSearch={handleFullSearch} />
      </div>

      {/* Results View (Grid) */}
      {view === 'list' && (
        <div className="w-full max-w-7xl mt-12 pb-24">
          <SearchResultsGrid
            results={searchResults}
            onSelect={handleSelectBook}
            onHover={handlePinpointBook}
          />

          {/* Infinite Scroll Trigger & Loading State */}
          {hasMore && (
            <div
              className="w-full py-12 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-700"
              ref={observerTarget}
            >
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">
                Loading more books...
              </div>
            </div>
          )}

          {!hasMore && searchResults.length > 0 && (
            <div className="w-full py-12 flex items-center justify-center">
              <div className="h-[1px] flex-1 bg-white/5" />
              <div className="px-6 text-[10px] text-neutral-700 uppercase tracking-[0.2em] font-bold">
                End of Results
              </div>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>
          )}
        </div>
      )}

      {/* Detail View (Map + Card) */}
      <div className={`w-full max-w-6xl mt-12 grid grid-cols-1 lg:grid-cols-4 gap-4 transition-all duration-1000 ${view === 'detail' ? 'opacity-100 translate-y-0' : 'fixed opacity-0 translate-y-10 pointer-events-none'}`}>
        {/* Map View */}
        <div className="lg:col-span-3 glass-portal overflow-hidden aspect-[4/3] lg:aspect-auto min-h-[400px]">
          <LibraryMap
            highlightedShelfId={highlightedShelf}
            activeWing={activeWing}
            onWingChange={setActiveWing}
          />
        </div>

        {/* Details Card */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-portal p-6 text-sm h-full flex flex-col">
            <h2 className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-4">Book Details</h2>
            <div className="text-white text-lg font-bold leading-tight mb-1">{selectedBook?.title}</div>
            <div className="text-neutral-400 mb-6">{selectedBook?.author}</div>

            <div className="space-y-4 flex-1">
              <div>
                <label className="text-neutral-600 text-[10px] font-bold uppercase block mb-1">Call Number</label>
                <div className="text-white font-mono text-lg">{selectedBook?.call_number}</div>
              </div>
              <div>
                <label className="text-neutral-600 text-[10px] font-bold uppercase block mb-1">Status</label>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-neutral-300">Available on Shelf</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <div className="text-[10px] text-neutral-500 space-y-2 uppercase tracking-wide">
                <p>● Pinpointed on Map</p>
              </div>

              {mappingConfidence === 'low' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex gap-2">
                    <div className="text-amber-500 font-bold text-[10px]">⚠️</div>
                    <div className="text-amber-200/70 text-[10px] leading-relaxed uppercase tracking-wider font-bold">
                      Location is a best guess. Please verify with library staff.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Branding */}
      <div className={`absolute bottom-8 left-8 flex items-center gap-3 transition-opacity duration-500 ${view === 'home' ? 'opacity-100' : 'opacity-20'}`}>
        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
          <div className="w-2 h-2 bg-neutral-500 rounded-full" />
        </div>
        <div>
          <div className="text-white text-[10px] font-bold uppercase tracking-wider">JIIT LRC</div>
          <div className="text-neutral-600 text-[10px]">Portal v1.1.0</div>
        </div>
      </div>

      {/* GitHub Link - Bottom Right */}
      <a
        href="https://github.com/skyruh/LRC.MAP"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 group transition-opacity duration-500 hover:opacity-100 opacity-60"
      >
        <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-md group-hover:border-white/30 group-hover:bg-white/10 transition-all">
          <svg className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </div>
      </a>
    </main>
  );
}
