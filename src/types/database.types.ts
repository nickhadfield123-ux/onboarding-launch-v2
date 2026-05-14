export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          email: string;
          name: string;
          avatar_url: string | null;
          metadata: Record<string, any> | null;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email: string;
          name: string;
          avatar_url?: string | null;
          metadata?: Record<string, any> | null;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          email?: string;
          name?: string;
          avatar_url?: string | null;
          metadata?: Record<string, any> | null;
        };
      };
      member_context: {
        Row: {
          user_id: string;
          invited_by: string | null;
          relationship_to_inviter: string | null;
          why_invited: string | null;
          nick_notes: string | null;
          suggested_rizz_opener: string | null;
        };
        Insert: {
          user_id: string;
          invited_by?: string | null;
          relationship_to_inviter?: string | null;
          why_invited?: string | null;
          nick_notes?: string | null;
          suggested_rizz_opener?: string | null;
        };
        Update: {
          user_id?: string;
          invited_by?: string | null;
          relationship_to_inviter?: string | null;
          why_invited?: string | null;
          nick_notes?: string | null;
          suggested_rizz_opener?: string | null;
        };
      };
    };
  };
}