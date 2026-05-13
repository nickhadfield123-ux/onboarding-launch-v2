'use client'

import React, { ReactNode, useState } from 'react'
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react'

interface PlatformFrameProps {
  children: ReactNode
  userName?: string
  leftSidebar?: {
    content: ReactNode
    defaultExpanded?: boolean
    expanded?: boolean
    width?: string
    onToggle?: () => void
  }
  rightSidebar?: {
    content: ReactNode
    defaultExpanded?: boolean
    expanded?: boolean
    width?: string
    onToggle?: () => void
  }
  topBar?: {
    leftContent?: ReactNode
    rightContent?: ReactNode
  }
}

export default function PlatformFrame({
  children,
  userName = "there",
  leftSidebar,
  rightSidebar,
  topBar
}: PlatformFrameProps) {
  const [leftExpandedInternal, setLeftExpandedInternal] = useState(leftSidebar?.defaultExpanded ?? true)
  const [rightExpandedInternal, setRightExpandedInternal] = useState(rightSidebar?.defaultExpanded ?? true)

  const leftExpanded = leftSidebar?.expanded !== undefined ? leftSidebar.expanded : leftExpandedInternal
  const rightExpanded = rightSidebar?.expanded !== undefined ? rightSidebar.expanded : rightExpandedInternal

  const handleToggleLeft = () => {
    if (leftSidebar?.onToggle) {
      leftSidebar.onToggle()
    } else {
      setLeftExpandedInternal(!leftExpandedInternal)
    }
  }

  const handleToggleRight = () => {
    if (rightSidebar?.onToggle) {
      rightSidebar.onToggle()
    } else {
      setRightExpandedInternal(!rightExpandedInternal)
    }
  }

  const leftWidth = leftSidebar?.width || '280px'
  const rightWidth = rightSidebar?.width || '300px'

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top Bar */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          {/* Left Sidebar Toggle */}
          {leftSidebar && (
            <button
              onClick={handleToggleLeft}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {leftExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
          
          {/* Logo and Brand */}
          <div className="flex items-center gap-2">
            {/* Infinity Logo */}
            <svg width="28" height="16" viewBox="0 0 28 16" className="flex-shrink-0">
              <path d="M7 8C7 5.8 8.8 4 11 4C13.2 4 14.8 5.5 16 8C17.2 10.5 18.8 12 21 12C23.2 12 25 10.2 25 8C25 5.8 23.2 4 21 4C18.8 4 17.2 5.5 16 8C14.8 10.5 13.2 12 11 12C8.8 12 7 10.2 7 8Z" 
                fill="none" stroke="url(#g)" strokeWidth="2.5"/>
              <defs>
                <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6c42c2"/>
                  <stop offset="100%" stopColor="#2d9e6b"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="text-[15px] font-medium" style={{
              background: 'linear-gradient(120deg, #6c42c2, #2d9e6b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Resourceful
            </span>
          </div>

          {/* Top Bar Left Content */}
          {topBar?.leftContent && (
            <div className="ml-4">
              {topBar.leftContent}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Top Bar Right Content */}
          {topBar?.rightContent && (
            <div className="mr-3">
              {topBar.rightContent}
            </div>
          )}
          
          {/* Right Sidebar Toggle */}
          {rightSidebar && (
            <button
              onClick={handleToggleRight}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {rightExpanded ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area - Use flex with dynamic width calculation */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        {leftSidebar && (
          <div 
            className="bg-white border-r border-gray-200 transition-all duration-300 ease-in-out"
            style={{ 
              width: leftExpanded ? leftWidth : '0px',
              minWidth: leftExpanded ? leftWidth : '0px',
              maxWidth: leftExpanded ? leftWidth : '0px',
              flexShrink: 0,
              opacity: leftExpanded ? 1 : 0,
              overflow: leftExpanded ? 'visible' : 'hidden'
            }}
          >
            <div className="h-full overflow-y-auto">
              {leftSidebar.content}
            </div>
          </div>
        )}

        {/* Main Content Container */}
        <div className="flex-1 bg-slate-900 p-6 min-w-0 overflow-auto">
          {children}
        </div>

        {/* Right Sidebar - Rizz */}
        {rightSidebar && (
          <div 
            className="bg-white border-l border-gray-200 transition-all duration-300 ease-in-out"
            style={{ 
              width: rightExpanded ? rightWidth : '0px',
              minWidth: rightExpanded ? rightWidth : '0px',
              maxWidth: rightExpanded ? rightWidth : '0px',
              flexShrink: 0,
              opacity: rightExpanded ? 1 : 0,
              overflow: rightExpanded ? 'visible' : 'hidden'
            }}
          >
            <div className="h-full overflow-y-auto">
              {rightSidebar.content}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}