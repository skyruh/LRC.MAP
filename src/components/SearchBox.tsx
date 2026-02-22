"use client"

import React, { useState, useEffect, useRef } from 'react';

type SearchResult = {
    id: string;
    title: string;
    author: string;
    call_number: string;
};

import { supabase } from '@/lib/supabase';

export default function SearchBox({ onSelect, onSearch }: {
    onSelect: (book: SearchResult) => void,
    onSearch: (query: string) => void
}) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let ignore = false;

        const fetchResults = async () => {
            if (query.length < 2) {
                setResults([]);
                setIsOpen(false);
                setLoading(false);
                return;
            }

            setLoading(true);
            const { data, error } = await supabase
                .rpc('fuzzy_search_books', {
                    query_text: query,
                    limit_val: 10,
                    offset_val: 0
                });

            if (!ignore) {
                if (error) {
                    console.error('Search error:', error);
                } else if (data) {
                    const formatted = data.map((b: any) => ({
                        id: String(b.biblionumber),
                        title: b.title,
                        author: b.authors || 'Unknown Author',
                        call_number: b.call_number || 'No Call No.'
                    }));
                    setResults(formatted);
                    setIsOpen(true);
                }
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300);
        return () => {
            ignore = true;
            clearTimeout(timeoutId);
        };
    }, [query]);

    const searchRef = useRef<HTMLDivElement>(null);

    // Focus on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={searchRef} className="relative w-full max-w-xl mx-auto z-50">
            <div className="glass-portal flex items-center px-6 py-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 focus-within:ring-1 focus-within:ring-white/30 focus-within:shadow-[0_0_60px_rgba(255,255,255,0.08)]">
                <svg className="w-5 h-5 text-neutral-500 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search books, authors, call numbers..."
                    className="bg-transparent border-none outline-none w-full text-lg text-white placeholder-neutral-700"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && query.length > 1) {
                            onSearch(query);
                            setQuery('');
                            setResults([]);
                            setIsOpen(false);
                            setLoading(false);
                        }
                    }}
                />
                <div className="flex items-center">
                    {loading && (
                        <div className="mr-3 animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                    )}
                    <div className="hidden sm:flex gap-1">
                        <kbd className="px-2 py-1 bg-neutral-900 rounded text-[10px] text-neutral-500 font-bold border border-neutral-800">CTRL</kbd>
                        <kbd className="px-2 py-1 bg-neutral-900 rounded text-[10px] text-neutral-500 font-bold border border-neutral-800">K</kbd>
                    </div>
                </div>
            </div>

            {/* Results Dropdown */}
            {isOpen && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-portal overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="max-h-[400px] overflow-y-auto">
                        {results.map((book) => (
                            <div
                                key={book.id}
                                className="px-6 py-4 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                                onClick={() => {
                                    onSelect(book);
                                    setQuery('');
                                    setResults([]);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="text-white font-medium">{book.title}</div>
                                <div className="flex justify-between items-center mt-1">
                                    <span className="text-sm text-neutral-500">{book.author}</span>
                                    <span className="text-[10px] px-2 py-0.5 bg-white/10 text-white rounded-full font-mono border border-white/20">
                                        {book.call_number}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
