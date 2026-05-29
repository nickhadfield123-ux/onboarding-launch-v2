'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, Users, TrendingUp, Send } from 'lucide-react'

interface Message {
  role: 'rizz' | 'user'
  text: string
  ts: number
}

interface RizzPanelProps {
  incomingMessage?: string   // SSE rizz_message drops in here
  inProgressMessage?: string // Real-time word-by-word text reveal
  roomId?: string
}

export function RizzPanel({ incomingMessage, inProgressMessage, roomId }: RizzPanelProps) {
   const [messages, setMessages] = useState<Message[]>([
     { role: 'rizz', text: "I'm Rizz. Say my name on the call or type here.", ts: Date.now() }
   ])
   const [input, setInput] = useState('')
   const bottomRef = useRef<HTMLDivElement>(null)
   const lastIncoming = useRef<string>('')
   const lastInProgress = useRef<string>('')
   const placeholderAdded = useRef(false)

   // When a new SSE message arrives, add it as a Rizz bubble
   useEffect(() => {
     if (!incomingMessage || incomingMessage === lastIncoming.current) return
     lastIncoming.current = incomingMessage
     placeholderAdded.current = false // Reset placeholder flag when full message arrives
     setMessages(prev => [...prev, { role: 'rizz', text: incomingMessage, ts: Date.now() }])
   }, [incomingMessage])

// When speech is in progress, update the last Rizz bubble with the progressive reveal
    useEffect(() => {
      if (!inProgressMessage) return
      
      console.log('[rizz-panel] progress:', inProgressMessage)
      
      // Add a placeholder bubble when speech starts (empty text)
      if (inProgressMessage === "" && !placeholderAdded.current) {
       placeholderAdded.current = true
       setMessages(prev => {
         // Check if we already have a placeholder being updated
         for (let i = prev.length - 1; i >= 0; i--) {
           if (prev[i].role === 'rizz' && prev[i].text === "") return prev
         }
         return [...prev, { role: 'rizz', text: "", ts: Date.now() }]
       })
       return
     }
     
     // Update the placeholder with progressive text
     setMessages(prev => {
       for (let i = prev.length - 1; i >= 0; i--) {
         if (prev[i].role === 'rizz') {
           const updated = [...prev]
           updated[i] = { ...updated[i], text: inProgressMessage }
           return updated
         }
       }
       return prev
     })
   }, [inProgressMessage])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text, ts: Date.now() }])

    // Call Rizz directly via the sidebar (typed messages)
    try {
      const rizzUrl = process.env.NEXT_PUBLIC_RIZZ_SERVER_URL || ''
      const res = await fetch(`${rizzUrl.replace(/\/$/, '')}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: roomId || 'sidebar', message: text, speaker: 'User' }),
      })
      const data = await res.json()
      if (data?.text) {
        setMessages(prev => [...prev, { role: 'rizz', text: data.text, ts: Date.now() }])

        // Play Celeste voice for the response (same as call transcript path)
        try {
          console.log('[rizz] tts text:', data.text)
          const ttsRes = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: data.text }),
          })
          if (!ttsRes.ok) {
            const err = await ttsRes.text()
            console.error('[rizz] tts error:', err)
          } else {
            const blob = await ttsRes.blob()
            new Audio(URL.createObjectURL(blob)).play()
          }
        } catch (ttsErr) {
          console.warn('[rizz] TTS failed for sidebar message:', ttsErr)
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'rizz', text: "Sorry, I'm having trouble connecting right now.", ts: Date.now() }])
    }
  }

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

      {/* Chat bubbles */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
              m.role === 'rizz'
                ? 'bg-gradient-to-r from-purple-50 to-green-50 border border-purple-100 text-gray-700'
                : 'bg-purple-600 text-white'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-3 grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-1 p-2 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
          <Users className="h-3 w-3 text-purple-600" />
          <span className="text-xs text-purple-700">Network</span>
        </button>
        <button className="flex items-center justify-center gap-1 p-2 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
          <TrendingUp className="h-3 w-3 text-green-600" />
          <span className="text-xs text-green-700">Progress</span>
        </button>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Ask me anything..."
            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
          />
          <button
            onClick={sendMessage}
            className="absolute right-1.5 top-1.5 p-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <Send className="h-3 w-3 text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
