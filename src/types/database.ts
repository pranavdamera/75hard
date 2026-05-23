// ── Database types (mirrors Supabase schema) ──────────────────

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          start_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          start_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          workout_1_done: boolean
          workout_2_done: boolean
          outdoor_workout_done: boolean
          diet_done: boolean
          water_done: boolean
          reading_done: boolean
          progress_photo_done: boolean
          no_alcohol_cheat_done: boolean
          notes: string | null
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          workout_1_done?: boolean
          workout_2_done?: boolean
          outdoor_workout_done?: boolean
          diet_done?: boolean
          water_done?: boolean
          reading_done?: boolean
          progress_photo_done?: boolean
          no_alcohol_cheat_done?: boolean
          notes?: string | null
          photo_url?: string | null
        }
        Update: {
          workout_1_done?: boolean
          workout_2_done?: boolean
          outdoor_workout_done?: boolean
          diet_done?: boolean
          water_done?: boolean
          reading_done?: boolean
          progress_photo_done?: boolean
          no_alcohol_cheat_done?: boolean
          notes?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      friend_links: {
        Row: {
          id: string
          user_id: string
          friend_user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_user_id: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_user_id?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// ── Convenience aliases ───────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type DailyLog = Database['public']['Tables']['daily_logs']['Row']
export type FriendLink = Database['public']['Tables']['friend_links']['Row']
export type DailyLogUpdate = Database['public']['Tables']['daily_logs']['Update']

// ── Task metadata ─────────────────────────────────────────────

export const TASK_KEYS = [
  'workout_1_done',
  'workout_2_done',
  'outdoor_workout_done',
  'diet_done',
  'water_done',
  'reading_done',
  'progress_photo_done',
  'no_alcohol_cheat_done',
] as const

export type TaskKey = (typeof TASK_KEYS)[number]

export const TASK_LABELS: Record<TaskKey, { label: string; emoji: string; description: string }> = {
  workout_1_done: {
    label: 'Workout 1',
    emoji: '🏋️',
    description: '45 min — any workout',
  },
  workout_2_done: {
    label: 'Workout 2',
    emoji: '💪',
    description: '45 min — second session',
  },
  outdoor_workout_done: {
    label: 'Outdoor Workout',
    emoji: '☀️',
    description: 'One workout must be outside',
  },
  diet_done: {
    label: 'Follow Diet',
    emoji: '🥗',
    description: 'No cheat meals',
  },
  water_done: {
    label: 'Drink 1 Gallon',
    emoji: '💧',
    description: 'Water only counts',
  },
  reading_done: {
    label: 'Read 10 Pages',
    emoji: '📖',
    description: 'Non-fiction book',
  },
  progress_photo_done: {
    label: 'Progress Photo',
    emoji: '📸',
    description: 'Required every day',
  },
  no_alcohol_cheat_done: {
    label: 'No Alcohol',
    emoji: '🚫',
    description: 'Zero exceptions',
  },
}
