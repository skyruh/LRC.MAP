"use client"

import React from 'react';

type SearchResult = {
    id: string;
    title: string;
    author: string;
    call_number: string;
};

export default function SearchResultsGrid({ results, onSelect, onHover }: {
    results: SearchResult[],
    onSelect: (book: SearchResult) => void,
    onHover?: (book: SearchResult) => void
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {results.map((book) => (
                <div
                    key={book.id}
                    onClick={() => onSelect(book)}
                    onMouseEnter={() => {
                        // Predictive Prefetching: Pinpoint on hover
                        // but don't switch view yet
                        onHover?.(book);
                    }}
                    style={{
                        contentVisibility: 'auto',
                        containIntrinsicSize: '200px'
                    }}
                    className="glass-portal p-6 group cursor-pointer hover:bg-white/5 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex flex-col justify-between h-[200px]"
                >
                    <div>
                        <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1">
                            {book.call_number}
                        </div>
                        <h3 className="text-white font-bold leading-tight line-clamp-3 group-hover:text-white transition-colors">
                            {book.title}
                        </h3>
                    </div>

                    <div className="mt-4 flex justify-between items-end">
                        <span className="text-sm text-neutral-400 font-medium line-clamp-1">{book.author}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
