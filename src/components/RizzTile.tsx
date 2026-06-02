"use client"

import React from "react"

interface RizzTileProps {
  isSpeaking: boolean
}

export function RizzTile({ isSpeaking }: RizzTileProps) {
  const gradientId = "rizz-ig"

  return (
    <div
      className={`relative bg-slate-800 rounded-xl overflow-hidden h-full w-full aspect-video transition-[box-shadow] duration-500 ease-out ${isSpeaking ? 'rizz-speaking' : ''}`}
    >
      <style>{`
        @keyframes gi {
          0%,100% { filter: drop-shadow(0 0 10px rgba(108,66,194,.35)) }
          50% { filter: drop-shadow(0 0 22px rgba(108,66,194,.65)) drop-shadow(0 0 14px rgba(45,158,107,.3)) }
        }
        @keyframes bob {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(-5px) }
        }
        @keyframes antb {
          0%,100% { transform: rotate(-8deg) translateY(0) }
          50% { transform: rotate(10deg) translateY(-2px) }
        }
        @keyframes wave {
          0%,100% { transform: rotate(-15deg) }
          50% { transform: rotate(10deg) translateY(-2px) }
        }
        @keyframes ebl {
          0%,88%,100% { transform: scaleY(1) }
          94% { transform: scaleY(.06) }
        }
        @keyframes rizz-speaking-pulse {
          0%, 100% { box-shadow: 0 0 10px 2px rgba(255,255,255,0.3), 0 0 25px 6px rgba(147,51,234,0.3); }
          50%      { box-shadow: 0 0 20px 6px rgba(255,255,255,0.7), 0 0 45px 12px rgba(147,51,234,0.6); }
        }
        .rizz-speaking {
          animation: rizz-speaking-pulse 1.4s ease-in-out infinite;
        }
      `}</style>

      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="-30 -30 240 270" 
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6c42c2"/>
            <stop offset="100%" stopColor="#2d9e6b"/>
          </linearGradient>
        </defs>
        <g style={{ transformOrigin: "90px 28px", animation: "antb 2s ease-in-out infinite" }}>
          <line x1="90" y1="28" x2="90" y2="8" stroke="#7F77DD" strokeWidth="3.5" strokeLinecap="round"/>
          <circle cx="90" cy="5" r="6" fill="#4a8026" stroke="#97C459" strokeWidth="2"/>
          <line x1="83" y1="-1" x2="78" y2="-7" stroke="#97C459" strokeWidth="2" strokeLinecap="round"/>
          <line x1="97" y1="-1" x2="102" y2="-7" stroke="#97C459" strokeWidth="2" strokeLinecap="round"/>
        </g>
        <rect x="20" y="18" width="140" height="100" rx="16" fill="#3d6b1f"/>
        <rect x="24" y="22" width="132" height="92" rx="12" fill="#4e8828"/>
        <circle cx="20" cy="68" r="13" fill="#534AB7"/>
        <circle cx="20" cy="68" r="8" fill="#3C3489"/>
        <circle cx="20" cy="68" r="4" fill="#AFA9EC"/>
        <circle cx="160" cy="68" r="13" fill="#534AB7"/>
        <circle cx="160" cy="68" r="8" fill="#3C3489"/>
        <circle cx="160" cy="68" r="4" fill="#AFA9EC"/>
        <rect x="30" y="28" width="120" height="76" rx="9" fill="#080810"/>
        <g style={{ transformOrigin: "68px 60px", animation: "ebl 4.5s ease-in-out infinite" }}>
          <ellipse cx="68" cy="60" rx="16" ry="19" fill="#97C459"/>
          <ellipse cx="68" cy="62" rx="10" ry="13" fill="#0d1800"/>
          <ellipse cx="63" cy="55" rx="4" ry="5" fill="#97C459" opacity=".55"/>
          <circle cx="62" cy="54" r="1.5" fill="#d4f08a"/>
        </g>
        <path d="M108 50 L124 61 L108 72" fill="none" stroke="#97C459" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="108" y1="50" x2="103" y2="43" stroke="#97C459" strokeWidth="2" strokeLinecap="round"/>
        <path d="M50 80 Q68 96 90 98 Q112 96 130 80" fill="none" stroke="#97C459" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="47" cy="82" r="5" fill="#97C459" opacity=".16"/>
        <circle cx="133" cy="82" r="5" fill="#97C459" opacity=".16"/>
        <rect x="72" y="118" width="36" height="16" rx="4" fill="#26215C"/>
        <rect x="72" y="133" width="36" height="10" rx="4" fill="#3d6b1f"/>
        <rect x="32" y="133" width="116" height="52" rx="12" fill="#3d6b1f"/>
        <rect x="38" y="137" width="104" height="44" rx="8" fill="#4e8828"/>
        <rect x="32" y="133" width="116" height="14" rx="12" fill="#534AB7"/>
        <rect x="32" y="142" width="116" height="5" fill="#534AB7"/>
        <g transform="translate(76,151) scale(1.7)">
          <path d="M7 8C7 5.8 8.8 4 11 4C13.2 4 14.8 5.5 16 8C17.2 10.5 18.8 12 21 12C23.2 12 25 10.2 25 8C25 5.8 23.2 4 21 4C18.8 4 17.2 5.5 16 8C14.8 10.5 13.2 12 11 12C8.8 12 7 10.2 7 8Z" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2.5"/>
        </g>
        <rect x="10" y="138" width="24" height="10" rx="5" fill="#534AB7"/>
        <rect x="4" y="147" width="18" height="26" rx="9" fill="#3d6b1f"/>
        <rect x="146" y="136" width="24" height="10" rx="5" fill="#534AB7"/>
        <g id="wave-arm" style={{ transformOrigin: "161px 120px", animation: "wave 1.2s ease-in-out infinite" }}>
          <rect x="150" y="114" width="22" height="26" rx="10" fill="#3d6b1f" transform="rotate(5,161,120)"/>
          <ellipse cx="164" cy="112" rx="12" ry="9" fill="#d3d1c7"/>
          <rect x="156" y="96" width="5" height="18" rx="2.5" fill="#d3d1c7" transform="rotate(-15,158,104)"/>
          <rect x="162" y="93" width="5" height="20" rx="2.5" fill="#d3d1c7"/>
          <rect x="168" y="95" width="5" height="18" rx="2.5" fill="#d3d1c7"/>
          <rect x="172" y="102" width="5" height="14" rx="2.5" fill="#d3d1c7" transform="rotate(30,174,106)"/>
          <rect x="151" y="106" width="7" height="5" rx="2.5" fill="#d3d1c7" transform="rotate(-30,154,108)"/>
        </g>
      </svg>
      
      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
        Rizz
      </div>
    </div>
  )
}