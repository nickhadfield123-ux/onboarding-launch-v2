// Meeting Types - Sovereign Coordination Layer

export type MeetingType = 
  | '1:1'
  | 'team-sync'
  | 'standup'
  | 'workshop'
  | 'podcast'
  | 'co-creation'
  | 'strategy'
  | 'quick-sync'
  | 'async-recording'
  | 'other'

export type MeetingStatus = 
  | 'scheduled'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled'

export type ParticipantRole = 
  | 'host'
  | 'attendee'
  | 'optional'
  | 'presenter'

export type ParticipantStatus = 
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'tentative'

export interface MeetingParticipant {
  id: string
  meeting_id: string
  user_id: string
  user_name: string
  user_email?: string
  role: ParticipantRole
  response_status: ParticipantStatus
  joined_at?: Date
  left_at?: Date
  created_at: Date
  updated_at: Date
}

export interface Meeting {
  id: string
  title: string
  description?: string
  meeting_type: MeetingType
  status: MeetingStatus
  
  // Timing (always store in UTC)
  start_time: Date
  end_time: Date
  timezone: string
  all_day: boolean
  recurring_rule?: string // RRULE format
  
  // Ownership
  created_by: string
  organization_id?: string
  
  // Video Integration
  video_provider?: 'daily' | 'zoom' | 'meet' | 'teams' | 'none'
  video_room_id?: string
  video_room_url?: string
  
  // Location (for hybrid/in-person)
  location_type?: 'virtual' | 'in-person' | 'hybrid'
  location_address?: string
  location_lat?: number
  location_lng?: number
  
  // Co-Creation / Media
  template_id?: string
  linked_project_id?: string
  linked_media_asset_id?: string
  recording_enabled: boolean
  visibility: 'private' | 'team' | 'organization' | 'public'
  
  // AI Context
  agenda?: string
  talking_points?: string[]
  ai_summary?: string
  ai_action_items?: string[]
  
  // Metadata
  created_at: Date
  updated_at: Date
  deleted_at?: Date
}

export interface MeetingTemplate {
  id: string
  name: string
  description: string
  meeting_type: MeetingType
  default_duration_minutes: number
  default_participants?: number
  agenda_template?: string
  talking_points_template?: string[]
  recording_enabled: boolean
  is_active: boolean
}

// Calendar event format for FullCalendar
export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  extendedProps: {
    meetingType: MeetingType
    status: MeetingStatus
    videoRoomUrl?: string
    locationType?: string
    participants: Array<{
      name: string
      role: ParticipantRole
      status: ParticipantStatus
    }>
    isHost: boolean
    hasJoined: boolean
    aiSummary?: string
  }
  backgroundColor?: string
  borderColor?: string
  textColor?: string
}

// Color coding for meeting types
export const MEETING_TYPE_COLORS: Record<MeetingType, { bg: string; border: string; text: string }> = {
  '1:1': { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  'team-sync': { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  'standup': { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
  'workshop': { bg: '#EDE9FE', border: '#8B5CF6', text: '#5B21B6' },
  'podcast': { bg: '#FCE7F3', border: '#EC4899', text: '#9D174D' },
  'co-creation': { bg: '#FFEDD5', border: '#F97316', text: '#9A3412' },
  'strategy': { bg: '#E0E7FF', border: '#6366F1', text: '#3730A3' },
  'quick-sync': { bg: '#CCFBF1', border: '#14B8A6', text: '#0F766E' },
  'async-recording': { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' },
  'other': { bg: '#F3F4F6', border: '#6B7280', text: '#374151' }
}

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  '1:1': '1:1 Meeting',
  'team-sync': 'Team Sync',
  'standup': 'Standup',
  'workshop': 'Workshop',
  'podcast': 'Podcast Recording',
  'co-creation': 'Co-Creation Session',
  'strategy': 'Strategy Session',
  'quick-sync': 'Quick Sync',
  'async-recording': 'Async Recording',
  'other': 'Other'
}