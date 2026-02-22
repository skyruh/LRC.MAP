"use client"

import React, { useState } from 'react';

type Shelf = {
    id: string;
    x: number;
    y: number;
    w: number;
    h: number;
    wing: 'CSE' | 'ECE';
};

const SHELVES: Shelf[] = [
    // CSE Wing (Right Wing)
    { id: '1', x: 140, y: 360, w: 250, h: 5, wing: 'CSE' },
    { id: '2', x: 140, y: 340, w: 250, h: 5, wing: 'CSE' },
    { id: '3', x: 140, y: 320, w: 250, h: 5, wing: 'CSE' },

    { id: '4', x: 240, y: 172, w: 5, h: 65, wing: 'CSE' },
    { id: '5', x: 270, y: 172, w: 5, h: 65, wing: 'CSE' },
    { id: '6', x: 300, y: 172, w: 5, h: 65, wing: 'CSE' },

    // 7-19 Top Right Vertical
    ...Array.from({ length: 13 }, (_, i) => ({
        id: String(7 + i),
        x: 140 + (i * 23),
        y: 40,
        w: 5,
        h: 90,
        wing: 'CSE' as const
    })),

    // ECE Wing (Left Wing)
    { id: '22', x: 200, y: 360, w: 180, h: 5, wing: 'ECE' },
    { id: '21', x: 200, y: 340, w: 180, h: 5, wing: 'ECE' },
    { id: '20', x: 200, y: 320, w: 180, h: 5, wing: 'ECE' },

    // 23-26 Top Left Vertical
    { id: '26', x: 70, y: 40, w: 5, h: 90, wing: 'ECE' },
    { id: '25', x: 100, y: 40, w: 5, h: 90, wing: 'ECE' },
    { id: '24', x: 130, y: 40, w: 5, h: 90, wing: 'ECE' },
    { id: '23', x: 160, y: 40, w: 5, h: 90, wing: 'ECE' },
];

export default function LibraryMap({
    highlightedShelfId,
    activeWing,
    onWingChange
}: {
    highlightedShelfId?: string,
    activeWing: 'CSE' | 'ECE',
    onWingChange: (wing: 'CSE' | 'ECE') => void
}) {
    return (
        <div className="relative w-full h-full bg-neutral-900/50 backdrop-blur-sm overflow-hidden flex flex-col group/map">
            {/* Wing Switcher */}
            <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
                <div className="flex gap-1 bg-black/40 p-1 rounded-full border border-white/5 backdrop-blur-md">
                    <button
                        onClick={() => onWingChange('ECE')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all duration-300 ${activeWing === 'ECE' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-neutral-500 hover:text-white'}`}
                    >
                        LEFT (ECE)
                    </button>
                    <button
                        onClick={() => onWingChange('CSE')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest transition-all duration-300 ${activeWing === 'CSE' ? 'bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' : 'text-neutral-500 hover:text-white'}`}
                    >
                        RIGHT (CSE)
                    </button>
                </div>

                <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-[0.2em] animate-pulse">
                    Indoor Pinpoint Active
                </div>
            </div>

            {/* Map Canvas */}
            <div className="flex-1 relative flex items-center justify-center p-12 lg:p-20">
                <svg
                    viewBox="0 0 500 400"
                    className="w-full h-full drop-shadow-2xl transition-all duration-1000 ease-in-out"
                >
                    {activeWing === 'CSE' ? (
                        <>
                            {/* CSE Room Outline */}
                            <path d="M 50 20 L 450 20 L 450 380 L 50 380 L 50 180 L 40 180 L 40 120 L 50 120 Z" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                            {/* Entrance */}
                            <path d="M 50 120 Q 20 120 20 150 T 50 180" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />

                            {/* L-Wall - Strict Boundary */}
                            <path
                                d="
                                    M 140 170
                                    L 225 170
                                    L 225 245
                                    L 325 245
                                    L 325 310
                                    L 140 310
                                    Z
                                "
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="3"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                            <text x="180" y="260" className="fill-white/5 text-2xl font-black uppercase tracking-[0.8em]"></text>
                        </>
                    ) : (
                        <>
                            {/* ECE Room Outline (L-shaped) */}
                            <path d="M 20 20 L 450 20 L 450 120 L 460 120 L 460 180 L 450 180 L 450 380 L 180 380 L 180 150 L 20 150 Z" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
                            {/* Entrance */}
                            <path d="M 450 120 Q 480 120 480 150 T 450 180" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="4,4" />

                            {/* L-Wall - Strict Boundary */}
                            <path
                                d="
                                    M 400 170
                                    L 325 170
                                    L 325 245
                                    L 260 245
                                    L 260 310
                                    L 400 310
                                    Z
                                "
                                fill="none"
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="3"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                            <text x="330" y="250" textAnchor="middle" className="fill-white/5 text-2xl font-black uppercase tracking-[0.8em]"></text>
                        </>
                    )}

                    {/* Shelves */}
                    {SHELVES.filter(s => s.wing === activeWing).map((shelf) => (
                        <g key={shelf.id} className="group/shelf">
                            <rect
                                x={shelf.x}
                                y={shelf.y}
                                width={shelf.w}
                                height={shelf.h}
                                className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${highlightedShelfId === shelf.id
                                    ? 'fill-white shadow-[0_0_30px_rgba(255,255,255,0.8)]'
                                    : 'fill-white/10 group-hover/map:fill-white/20'
                                    }`}
                            />
                            {highlightedShelfId === shelf.id && (
                                <>
                                    <rect
                                        x={shelf.x - 2}
                                        y={shelf.y - 2}
                                        width={shelf.w + 4}
                                        height={shelf.h + 4}
                                        className="fill-none stroke-white/40 stroke-[2] animate-pulse"
                                    />
                                    <text
                                        x={shelf.x + shelf.w / 2}
                                        y={shelf.y - 8}
                                        textAnchor="middle"
                                        className="fill-white text-[8px] font-bold font-mono"
                                    >
                                        #{shelf.id}
                                    </text>
                                </>
                            )}
                        </g>
                    ))}

                    {/* Floor Label */}
                    <text x="20" y="400" className="fill-neutral-700 text-[8px] font-mono uppercase tracking-[0.5em]">
                        {activeWing} WING • ABB-III BASEMENT • LRC.MAP
                    </text>
                </svg>
            </div>

            {/* Map Legend */}
            <div className="px-8 py-6 border-t border-white/5 bg-black/20 flex justify-between items-center">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-widest">Pinpoint</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 group/coord cursor-help">
                    <div className="w-1 h-1 bg-white/10 rounded-full" />
                    <span className="text-[8px] text-neutral-800 font-mono group-hover/coord:text-neutral-500 transition-colors tracking-tighter">
                        45.0233° N, 122.993° W • REF:B1-LRC
                    </span>
                </div>
            </div>
        </div>
    );
}
