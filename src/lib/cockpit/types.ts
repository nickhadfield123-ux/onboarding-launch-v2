// Call State Management Types
export interface CallState {
  isInCall: boolean
  activeRoomUrl: string | null
  activeRoomToken: string | null
  isFullscreen: boolean
  isMuted: boolean
  isVideoOff: boolean
  isScreenSharing: boolean
  participants: Record<string, any> | null
  error: string | null
}

export type CallAction = 
  | { type: 'START_CALL'; payload: { roomUrl: string; roomToken?: string } }
  | { type: 'END_CALL' }
  | { type: 'TOGGLE_FULLSCREEN' }
  | { type: 'TOGGLE_MICROPHONE' }
  | { type: 'TOGGLE_CAMERA' }
  | { type: 'TOGGLE_SCREEN_SHARE' }
  | { type: 'SET_PARTICIPANTS'; payload: Record<string, any> }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'CLEAR_ERROR' }

// Rizz Context Types
export type RizzMode = 'dashboard' | 'team-meeting' | 'sales-call' | 'network-session' | 'pre-call' | 'call' | 'summary'

export interface RizzState {
  mode: RizzMode
  isListening: boolean
  transcript: string
  insights: string[]
  summary: string | null
}

export type RizzAction =
  | { type: 'SET_MODE'; payload: RizzMode }
  | { type: 'TOGGLE_LISTENING' }
  | { type: 'ADD_TRANSCRIPT'; payload: string }
  | { type: 'SET_INSIGHTS'; payload: string[] }
  | { type: 'SET_SUMMARY'; payload: string | null }
  | { type: 'CLEAR_DATA' }

// Layout State Types
export interface LayoutState {
  isLeftNavCollapsed: boolean
  isRizzCollapsed: boolean
  isFullscreen: boolean
}

export type LayoutAction =
  | { type: 'TOGGLE_LEFT_NAV' }
  | { type: 'TOGGLE_RIZZ' }
  | { type: 'SET_FULLSCREEN'; payload: boolean }
  | { type: 'RESET_LAYOUT' }
