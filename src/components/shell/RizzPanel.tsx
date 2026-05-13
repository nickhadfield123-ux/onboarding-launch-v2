'use client'

import React from 'react'
import { MessageCircle, Users, TrendingUp, Send } from 'lucide-react'

interface RizzPanelProps {
  message?: string
  items?: Array<{ dot: string; text: string; action?: string }>
  stats?: Array<{ value: string; label: string }>
  placeholder?: string
  userName?: string
}

export function RizzPanel({
  message = "I'm Rizz, your AI assistant. How can I help you today?",
  items = [],
  stats = [],
  placeholder = "Ask me anything...",
  userName = "there"
}: RizzPanelProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-green-500 flex items-center justify-center">
            <MessageCircle className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Rizz</h3>
            <p className="text-xs text-gray-500">AI Assistant</p>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-purple-50 to-green-50 rounded-xl p-3 border border-purple-100">
          <p className="text-xs text-gray-700 leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      {/* Status Items */}
      {items.length > 0 && (
        <div className="px-4 pb-3">
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.dot }}
                />
                <span className="text-xs text-gray-700 flex-1">{item.text}</span>
                {item.action && (
                  <button className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                    {item.action}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {stats.length > 0 && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <button className="flex items-center justify-center gap-1 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
            <Users className="h-3 w-3 text-purple-600" />
            <span className="text-xs text-purple-700">Network</span>
          </button>
          <button className="flex items-center justify-center gap-1 p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
            <TrendingUp className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-700">Progress</span>
          </button>
        </div>
      </div>

      {/* Chat Input */}
      <div className="mt-auto p-4 border-t border-gray-200">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
          />
          <button className="absolute right-1.5 top-1.5 p-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors">
            <Send className="h-3 w-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
