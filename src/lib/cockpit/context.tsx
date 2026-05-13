"use client"

import * as React from "react"
import { CallState, CallAction, RizzState, RizzAction, LayoutState, LayoutAction } from "./types"

// Call Context
const CallContext = React.createContext<{
  state: CallState
  dispatch: React.Dispatch<CallAction>
} | null>(null)

// Rizz Context
const RizzContext = React.createContext<{
  state: RizzState
  dispatch: React.Dispatch<RizzAction>
} | null>(null)

// Layout Context
const LayoutContext = React.createContext<{
  state: LayoutState
  dispatch: React.Dispatch<LayoutAction>
} | null>(null)

// Initial States
const initialCallState: CallState = {
  isInCall: false,
  activeRoomUrl: null,
  activeRoomToken: null,
  isFullscreen: false,
  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  participants: null,
  error: null
}

const initialRizzState: RizzState = {
  mode: 'dashboard',
  isListening: false,
  transcript: '',
  insights: [],
  summary: null
}

const initialLayoutState: LayoutState = {
  isLeftNavCollapsed: false,
  isRizzCollapsed: false,
  isFullscreen: false
}

// Reducers
function callReducer(state: CallState, action: CallAction): CallState {
  switch (action.type) {
    case 'START_CALL':
      return {
        ...state,
        isInCall: true,
        activeRoomUrl: action.payload.roomUrl,
        activeRoomToken: action.payload.roomToken || null,
        error: null
      }
    case 'END_CALL':
      return {
        ...initialCallState,
        isFullscreen: state.isFullscreen // Preserve fullscreen state
      }
    case 'TOGGLE_FULLSCREEN':
      return {
        ...state,
        isFullscreen: !state.isFullscreen
      }
    case 'TOGGLE_MICROPHONE':
      return {
        ...state,
        isMuted: !state.isMuted
      }
    case 'TOGGLE_CAMERA':
      return {
        ...state,
        isVideoOff: !state.isVideoOff
      }
    case 'TOGGLE_SCREEN_SHARE':
      return {
        ...state,
        isScreenSharing: !state.isScreenSharing
      }
    case 'SET_PARTICIPANTS':
      return {
        ...state,
        participants: action.payload
      }
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      }
    default:
      return state
  }
}

function rizzReducer(state: RizzState, action: RizzAction): RizzState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload
      }
    case 'TOGGLE_LISTENING':
      return {
        ...state,
        isListening: !state.isListening
      }
    case 'ADD_TRANSCRIPT':
      return {
        ...state,
        transcript: state.transcript + action.payload
      }
    case 'SET_INSIGHTS':
      return {
        ...state,
        insights: action.payload
      }
    case 'SET_SUMMARY':
      return {
        ...state,
        summary: action.payload
      }
    case 'CLEAR_DATA':
      return {
        ...initialRizzState,
        mode: state.mode // Preserve current mode
      }
    default:
      return state
  }
}

function layoutReducer(state: LayoutState, action: LayoutAction): LayoutState {
  switch (action.type) {
    case 'TOGGLE_LEFT_NAV':
      return {
        ...state,
        isLeftNavCollapsed: !state.isLeftNavCollapsed
      }
    case 'TOGGLE_RIZZ':
      return {
        ...state,
        isRizzCollapsed: !state.isRizzCollapsed
      }
    case 'SET_FULLSCREEN':
      return {
        ...state,
        isFullscreen: action.payload
      }
    case 'RESET_LAYOUT':
      return {
        ...initialLayoutState
      }
    default:
      return state
  }
}

// Providers
export function CallProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(callReducer, initialCallState)
  
  return (
    <CallContext.Provider value={{ state, dispatch }}>
      {children}
    </CallContext.Provider>
  )
}

export function RizzProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(rizzReducer, initialRizzState)
  
  return (
    <RizzContext.Provider value={{ state, dispatch }}>
      {children}
    </RizzContext.Provider>
  )
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(layoutReducer, initialLayoutState)
  
  return (
    <LayoutContext.Provider value={{ state, dispatch }}>
      {children}
    </LayoutContext.Provider>
  )
}

// Combined Provider
export function CockpitProvider({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider>
      <RizzProvider>
        <LayoutProvider>
          {children}
        </LayoutProvider>
      </RizzProvider>
    </CallProvider>
  )
}

// Hooks
export function useCall() {
  const context = React.useContext(CallContext)
  if (!context) {
    throw new Error('useCall must be used within a CallProvider')
  }
  return context
}

export function useRizz() {
  const context = React.useContext(RizzContext)
  if (!context) {
    throw new Error('useRizz must be used within a RizzProvider')
  }
  return context
}

export function useLayout() {
  const context = React.useContext(LayoutContext)
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider')
  }
  return context
}