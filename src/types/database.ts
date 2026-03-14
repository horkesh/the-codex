export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          created_at: string | null
          criteria: Json
          description: string
          earned_at: string | null
          earned_by: string | null
          icon: string | null
          id: string
          name: string
          stamp_id: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          criteria?: Json
          description: string
          earned_at?: string | null
          earned_by?: string | null
          icon?: string | null
          id?: string
          name: string
          stamp_id?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          criteria?: Json
          description?: string
          earned_at?: string | null
          earned_by?: string | null
          icon?: string | null
          id?: string
          name?: string
          stamp_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievements_earned_by_fkey"
            columns: ["earned_by"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "achievements_earned_by_fkey"
            columns: ["earned_by"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievements_stamp_id_fkey"
            columns: ["stamp_id"]
            isOneToOne: false
            referencedRelation: "passport_stamps"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string
          date: string
          description: string | null
          id: string
          location: string | null
          lore: string | null
          lore_generated_at: string | null
          metadata: Json
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by: string
          date: string
          description?: string | null
          id?: string
          location?: string | null
          lore?: string | null
          lore_generated_at?: string | null
          metadata?: Json
          status?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string
          date?: string
          description?: string | null
          id?: string
          location?: string | null
          lore?: string | null
          lore_generated_at?: string | null
          metadata?: Json
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_participants: {
        Row: {
          entry_id: string
          gent_id: string
          role: string | null
        }
        Insert: {
          entry_id: string
          gent_id: string
          role?: string | null
        }
        Update: {
          entry_id?: string
          gent_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_participants_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_participants_gent_id_fkey"
            columns: ["gent_id"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "entry_participants_gent_id_fkey"
            columns: ["gent_id"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_photos: {
        Row: {
          caption: string | null
          created_at: string | null
          entry_id: string
          id: string
          sort_order: number
          taken_by: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          entry_id: string
          id?: string
          sort_order?: number
          taken_by?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          entry_id?: string
          id?: string
          sort_order?: number
          taken_by?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_photos_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_photos_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "entry_photos_taken_by_fkey"
            columns: ["taken_by"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
        ]
      }
      gathering_rsvps: {
        Row: {
          created_at: string | null
          email: string | null
          entry_id: string
          id: string
          name: string
          response: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          entry_id: string
          id?: string
          name: string
          response: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          entry_id?: string
          id?: string
          name?: string
          response?: string
        }
        Relationships: [
          {
            foreignKeyName: "gathering_rsvps_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      gents: {
        Row: {
          alias: string
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          full_alias: string
          id: string
        }
        Insert: {
          alias: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          full_alias: string
          id: string
        }
        Update: {
          alias?: string
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          full_alias?: string
          id?: string
        }
        Relationships: []
      }
      guest_book_messages: {
        Row: {
          cocktail_chosen: string | null
          created_at: string | null
          entry_id: string
          guest_name: string
          id: string
          message: string | null
        }
        Insert: {
          cocktail_chosen?: string | null
          created_at?: string | null
          entry_id: string
          guest_name: string
          id?: string
          message?: string | null
        }
        Update: {
          cocktail_chosen?: string | null
          created_at?: string | null
          entry_id?: string
          guest_name?: string
          id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_book_messages_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      passport_stamps: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          created_at: string | null
          date_earned: string
          description: string | null
          entry_id: string | null
          id: string
          image_url: string | null
          name: string
          type: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          date_earned: string
          description?: string | null
          entry_id?: string | null
          id?: string
          image_url?: string | null
          name: string
          type: string
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          date_earned?: string
          description?: string | null
          entry_id?: string | null
          id?: string
          image_url?: string | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "passport_stamps_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          added_by: string | null
          created_at: string | null
          id: string
          instagram: string | null
          labels: string[]
          met_at_entry: string | null
          met_date: string | null
          met_location: string | null
          name: string
          notes: string | null
          photo_url: string | null
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          instagram?: string | null
          labels?: string[]
          met_at_entry?: string | null
          met_date?: string | null
          met_location?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          instagram?: string | null
          labels?: string[]
          met_at_entry?: string | null
          met_date?: string | null
          met_location?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "people_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_met_at_entry_fkey"
            columns: ["met_at_entry"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      people_notes: {
        Row: {
          created_at: string | null
          gent_id: string
          id: string
          note: string
          person_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          gent_id: string
          id?: string
          note: string
          person_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          gent_id?: string
          id?: string
          note?: string
          person_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_notes_gent_id_fkey"
            columns: ["gent_id"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "people_notes_gent_id_fkey"
            columns: ["gent_id"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_notes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gent_stats: {
        Row: {
          alias: string | null
          cities_visited: number | null
          countries_visited: number | null
          gatherings: number | null
          gent_id: string | null
          missions: number | null
          nights_out: number | null
          people_met: number | null
          ps5_sessions: number | null
          stamps_collected: number | null
          steaks: number | null
          toasts: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
