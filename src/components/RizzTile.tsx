"use client"

import React from "react"

interface RizzTileProps {
  isSpeaking: boolean
  lastWords: string
}

export function RizzTile({ isSpeaking, lastWords }: RizzTileProps) {
  return (
    <div className="flex flex-col items-center p-3 bg-slate-800/80 rounded-xl border border-slate-700">
      <div
        className={`
          w-14 h-14 rounded-full 
          bg-gradient-to-br from-[#6c42c2] to-[#2d9e6b] 
          flex items-center justify-center text-white text-2xl font-bold
          shadow-inner
          ${isSpeaking ? "animate-[pulse_1.5s_ease-in-out_infinite]" : ""}
        `}
        style={isSpeaking ? { boxShadow: "0 0 0 4px rgba(108, 66, 194, 0.3)" } : {}}
      >
        🤖
      </div>
      <div className="mt-2 text-xs font-semibold text-white tracking-wide">Rizz</div>
      <div className="text-[10px] text-slate-400 mt-0.5 text-center truncate max-w-[90px] h-3">
        {lastWords || "Listening..."}
      </div>
    </div>
  )
}
