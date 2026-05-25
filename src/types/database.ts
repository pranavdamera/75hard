// ── Database types (mirrors Supabase schema) ──────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          start_date: string | null
          onboarding_completed: boolean
          challenge_style: string
          goal_type: string | null
          age: number | null
          sex: string | null
          height_inches: number | null
          current_weight_lbs: number | null
          goal_weight_lbs: number | null
          activity_level: string | null
          friends_can_view_photos: boolean
          friends_can_view_workout_notes: boolean
          friends_can_view_meals: boolean
          protein_preference: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          start_date?: string | null
          onboarding_completed?: boolean
          challenge_style?: string
          goal_type?: string | null
          age?: number | null
          sex?: string | null
          height_inches?: number | null
          current_weight_lbs?: number | null
          goal_weight_lbs?: number | null
          activity_level?: string | null
          friends_can_view_photos?: boolean
          friends_can_view_workout_notes?: boolean
          friends_can_view_meals?: boolean
          protein_preference?: string
        }
        Update: {
          display_name?: string | null
          start_date?: string | null
          onboarding_completed?: boolean
          challenge_style?: string
          goal_type?: string | null
          age?: number | null
          sex?: string | null
          height_inches?: number | null
          current_weight_lbs?: number | null
          goal_weight_lbs?: number | null
          activity_level?: string | null
          friends_can_view_photos?: boolean
          friends_can_view_workout_notes?: boolean
          friends_can_view_meals?: boolean
          protein_preference?: string
          updated_at?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          // current workout fields
          indoor_workout_done: boolean
          indoor_workout_notes: string | null
          indoor_workout_minutes: number | null
          outdoor_workout_done: boolean
          outdoor_workout_notes: string | null
          outdoor_workout_minutes: number | null
          // legacy (kept for compat, not displayed)
          workout_1_done: boolean
          workout_2_done: boolean
          // tasks
          diet_done: boolean
          water_done: boolean
          reading_done: boolean
          progress_photo_done: boolean
          no_alcohol_cheat_done: boolean
          // meal log
          breakfast: string | null
          lunch: string | null
          dinner: string | null
          snacks: string | null
          // general
          notes: string | null
          photo_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          log_date: string
          indoor_workout_done?: boolean
          indoor_workout_notes?: string | null
          indoor_workout_minutes?: number | null
          outdoor_workout_done?: boolean
          outdoor_workout_notes?: string | null
          outdoor_workout_minutes?: number | null
          diet_done?: boolean
          water_done?: boolean
          reading_done?: boolean
          progress_photo_done?: boolean
          no_alcohol_cheat_done?: boolean
          breakfast?: string | null
          lunch?: string | null
          dinner?: string | null
          snacks?: string | null
          notes?: string | null
          photo_url?: string | null
        }
        Update: {
          indoor_workout_done?: boolean
          indoor_workout_notes?: string | null
          indoor_workout_minutes?: number | null
          outdoor_workout_done?: boolean
          outdoor_workout_notes?: string | null
          outdoor_workout_minutes?: number | null
          diet_done?: boolean
          water_done?: boolean
          reading_done?: boolean
          progress_photo_done?: boolean
          no_alcohol_cheat_done?: boolean
          breakfast?: string | null
          lunch?: string | null
          dinner?: string | null
          snacks?: string | null
          notes?: string | null
          photo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      friend_links: {
        Row: { id: string; user_id: string; friend_user_id: string; created_at: string }
        Insert: { id?: string; user_id: string; friend_user_id: string }
        Update: Record<string, never>
        Relationships: []
      }
      challenge_tasks: {
        Row: {
          id: string
          user_id: string
          task_key: ChallengeTaskKey
          task_label: string
          enabled: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_key: ChallengeTaskKey
          task_label: string
          enabled?: boolean
          sort_order?: number
        }
        Update: { task_label?: string; enabled?: boolean; sort_order?: number }
        Relationships: []
      }
      nutrition_goals: {
        Row: {
          id: string
          user_id: string
          goal_type: string | null
          target_calories: number | null
          protein_g: number | null
          carbs_g: number | null
          fat_g: number | null
          maintenance_calories: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal_type?: string | null
          target_calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          maintenance_calories?: number | null
        }
        Update: {
          goal_type?: string | null
          target_calories?: number | null
          protein_g?: number | null
          carbs_g?: number | null
          fat_g?: number | null
          maintenance_calories?: number | null
          updated_at?: string
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

// ── Convenience aliases ────────────────────────────────────────

export type Profile      = Database['public']['Tables']['profiles']['Row']
export type DailyLog     = Database['public']['Tables']['daily_logs']['Row']
export type FriendLink   = Database['public']['Tables']['friend_links']['Row']
export type ChallengeTask = Database['public']['Tables']['challenge_tasks']['Row']
export type NutritionGoal = Database['public']['Tables']['nutrition_goals']['Row']

// ── Task key types ─────────────────────────────────────────────

// Column names in daily_logs for boolean done fields
export type TaskKey =
  | 'indoor_workout_done'
  | 'outdoor_workout_done'
  | 'diet_done'
  | 'water_done'
  | 'reading_done'
  | 'progress_photo_done'
  | 'no_alcohol_cheat_done'

// Keys used in challenge_tasks.task_key
export type ChallengeTaskKey =
  | 'indoor_workout'
  | 'outdoor_workout'
  | 'diet'
  | 'water'
  | 'reading'
  | 'progress_photo'
  | 'no_alcohol'

export const ALL_CHALLENGE_TASK_KEYS: ChallengeTaskKey[] = [
  'indoor_workout',
  'outdoor_workout',
  'diet',
  'water',
  'reading',
  'progress_photo',
  'no_alcohol',
]

// Maps challenge_tasks.task_key → daily_logs column
export const TASK_TO_LOG_KEY: Record<ChallengeTaskKey, TaskKey> = {
  indoor_workout:  'indoor_workout_done',
  outdoor_workout: 'outdoor_workout_done',
  diet:            'diet_done',
  water:           'water_done',
  reading:         'reading_done',
  progress_photo:  'progress_photo_done',
  no_alcohol:      'no_alcohol_cheat_done',
}

// Default task definitions (used as fallback and in onboarding)
export const DEFAULT_TASKS: Array<{ task_key: ChallengeTaskKey; task_label: string; sort_order: number }> = [
  { task_key: 'indoor_workout',  task_label: 'Indoor Workout',  sort_order: 0 },
  { task_key: 'outdoor_workout', task_label: 'Outdoor Workout', sort_order: 1 },
  { task_key: 'diet',            task_label: 'Follow Diet',     sort_order: 2 },
  { task_key: 'water',           task_label: 'Drink 1 Gallon',  sort_order: 3 },
  { task_key: 'reading',         task_label: 'Read 10 Pages',   sort_order: 4 },
  { task_key: 'progress_photo',  task_label: 'Progress Photo',  sort_order: 5 },
  { task_key: 'no_alcohol',      task_label: 'No Alcohol',      sort_order: 6 },
]

// UI metadata per task key
export const TASK_META: Record<ChallengeTaskKey, { emoji: string; description: string }> = {
  indoor_workout:  { emoji: '🏋️', description: '45 min session' },
  outdoor_workout: { emoji: '☀️', description: 'Must be outside' },
  diet:            { emoji: '🥗', description: 'No cheat meals' },
  water:           { emoji: '💧', description: '1 gallon minimum' },
  reading:         { emoji: '📖', description: '10 pages, non-fiction' },
  progress_photo:  { emoji: '📸', description: 'Take a daily photo' },
  no_alcohol:      { emoji: '🚫', description: 'Zero exceptions' },
}

// For backward compat with any remaining consumers
export const TASK_KEYS: readonly TaskKey[] = [
  'indoor_workout_done',
  'outdoor_workout_done',
  'diet_done',
  'water_done',
  'reading_done',
  'progress_photo_done',
  'no_alcohol_cheat_done',
] as const

export const TASK_LABELS: Record<TaskKey, { label: string; emoji: string; description: string }> = {
  indoor_workout_done:   { label: 'Indoor Workout',  emoji: '🏋️', description: '45 min session' },
  outdoor_workout_done:  { label: 'Outdoor Workout', emoji: '☀️', description: 'Must be outside' },
  diet_done:             { label: 'Follow Diet',     emoji: '🥗', description: 'No cheat meals' },
  water_done:            { label: 'Drink 1 Gallon',  emoji: '💧', description: '1 gallon minimum' },
  reading_done:          { label: 'Read 10 Pages',   emoji: '📖', description: '10 pages, non-fiction' },
  progress_photo_done:   { label: 'Progress Photo',  emoji: '📸', description: 'Take a daily photo' },
  no_alcohol_cheat_done: { label: 'No Alcohol',      emoji: '🚫', description: 'Zero exceptions' },
}
