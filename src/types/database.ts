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
      bucket_list: {
        Row: {
          added_by: string | null
          category: string | null
          city: string | null
          converted_entry_id: string | null
          country: string | null
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
          title: string
        }
        Insert: {
          added_by?: string | null
          category?: string | null
          city?: string | null
          converted_entry_id?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          title: string
        }
        Update: {
          added_by?: string | null
          category?: string | null
          city?: string | null
          converted_entry_id?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "bucket_list_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "bucket_list_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bucket_list_converted_entry_id_fkey"
            columns: ["converted_entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
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
          pinned: boolean
          scene_url: string | null
          status: string
          title: string
          type: string
          updated_at: string | null
          visibility: string
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
          pinned?: boolean
          scene_url?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string | null
          visibility?: string
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
          pinned?: boolean
          scene_url?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          visibility?: string
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
      entry_comments: {
        Row: {
          id: string
          entry_id: string
          gent_id: string
          body: string
          created_at: string | null
        }
        Insert: {
          id?: string
          entry_id: string
          gent_id: string
          body: string
          created_at?: string | null
        }
        Update: {
          id?: string
          entry_id?: string
          gent_id?: string
          body?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entry_comments_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_comments_gent_id_fkey"
            columns: ["gent_id"]
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
          appearance_description: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          full_alias: string
          id: string
          portrait_url: string | null
          retired: boolean
          status: string | null
          status_expires_at: string | null
        }
        Insert: {
          alias: string
          appearance_description?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          full_alias: string
          id: string
          portrait_url?: string | null
          retired?: boolean
          status?: string | null
          status_expires_at?: string | null
        }
        Update: {
          alias?: string
          appearance_description?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          full_alias?: string
          id?: string
          portrait_url?: string | null
          retired?: boolean
          status?: string | null
          status_expires_at?: string | null
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
      locations: {
        Row: {
          address: string | null
          city: string
          country: string
          country_code: string
          created_at: string | null
          created_by: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          type: string
        }
        Insert: {
          address?: string | null
          city: string
          country: string
          country_code: string
          created_at?: string | null
          created_by: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          type?: string
        }
        Update: {
          address?: string | null
          city?: string
          country?: string
          country_code?: string
          created_at?: string | null
          created_by?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "locations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gents"
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
      person_appearances: {
        Row: {
          id: string
          person_id: string
          entry_id: string
          noted_by: string
          created_at: string | null
        }
        Insert: {
          id?: string
          person_id: string
          entry_id: string
          noted_by: string
          created_at?: string | null
        }
        Update: {
          id?: string
          person_id?: string
          entry_id?: string
          noted_by?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_appearances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_appearances_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_appearances_noted_by_fkey"
            columns: ["noted_by"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          added_by: string | null
          category: string | null
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
          poi_intel: string | null
          poi_source_gent: string | null
          poi_source_url: string | null
          poi_visibility: string | null
          portrait_url: string | null
          instagram_source_url: string | null
          tier: string | null
        }
        Insert: {
          added_by?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          instagram?: string | null
          instagram_source_url?: string | null
          labels?: string[]
          met_at_entry?: string | null
          met_date?: string | null
          met_location?: string | null
          name: string
          notes?: string | null
          photo_url?: string | null
          poi_intel?: string | null
          poi_source_gent?: string | null
          poi_source_url?: string | null
          poi_visibility?: string | null
          portrait_url?: string | null
          tier?: string | null
        }
        Update: {
          added_by?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          instagram?: string | null
          instagram_source_url?: string | null
          labels?: string[]
          met_at_entry?: string | null
          met_date?: string | null
          met_location?: string | null
          name?: string
          notes?: string | null
          photo_url?: string | null
          poi_intel?: string | null
          poi_source_gent?: string | null
          poi_source_url?: string | null
          poi_visibility?: string | null
          portrait_url?: string | null
          tier?: string | null
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
          {
            foreignKeyName: "people_poi_source_gent_fkey"
            columns: ["poi_source_gent"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "people_poi_source_gent_fkey"
            columns: ["poi_source_gent"]
            isOneToOne: false
            referencedRelation: "gents"
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
      person_scans: {
        Row: {
          id: string
          created_by: string
          person_id: string | null
          source_type: string
          source_photo_url: string | null
          instagram_handle: string | null
          instagram_source_url: string | null
          generated_avatar_url: string | null
          appearance_description: string | null
          trait_words: string[] | null
          score: number | null
          verdict_label: string | null
          confidence: number | null
          recommended_category: string | null
          display_name: string | null
          bio: string | null
          why_interesting: string | null
          best_opener: string | null
          green_flags: string[] | null
          watchouts: string[] | null
          review_payload: Json | null
          status: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          created_by: string
          person_id?: string | null
          source_type: string
          source_photo_url?: string | null
          instagram_handle?: string | null
          instagram_source_url?: string | null
          generated_avatar_url?: string | null
          appearance_description?: string | null
          trait_words?: string[] | null
          score?: number | null
          verdict_label?: string | null
          confidence?: number | null
          recommended_category?: string | null
          display_name?: string | null
          bio?: string | null
          why_interesting?: string | null
          best_opener?: string | null
          green_flags?: string[] | null
          watchouts?: string[] | null
          review_payload?: Json | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          created_by?: string
          person_id?: string | null
          source_type?: string
          source_photo_url?: string | null
          instagram_handle?: string | null
          instagram_source_url?: string | null
          generated_avatar_url?: string | null
          appearance_description?: string | null
          trait_words?: string[] | null
          score?: number | null
          verdict_label?: string | null
          confidence?: number | null
          recommended_category?: string | null
          display_name?: string | null
          bio?: string | null
          why_interesting?: string | null
          best_opener?: string | null
          green_flags?: string[] | null
          watchouts?: string[] | null
          review_payload?: Json | null
          status?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "person_scans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "person_scans_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      prospects: {
        Row: {
          city: string | null
          converted_entry_id: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          dress_code: string | null
          estimated_price: string | null
          event_date: string | null
          event_name: string | null
          id: string
          location: string | null
          notes: string | null
          source_thumbnail_url: string | null
          source_url: string | null
          status: string | null
          venue_name: string | null
          visibility: string | null
          vibe: string | null
        }
        Insert: {
          city?: string | null
          converted_entry_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          dress_code?: string | null
          estimated_price?: string | null
          event_date?: string | null
          event_name?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          source_thumbnail_url?: string | null
          source_url?: string | null
          status?: string | null
          venue_name?: string | null
          visibility?: string | null
          vibe?: string | null
        }
        Update: {
          city?: string | null
          converted_entry_id?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          dress_code?: string | null
          estimated_price?: string | null
          event_date?: string | null
          event_name?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          source_thumbnail_url?: string | null
          source_url?: string | null
          status?: string | null
          venue_name?: string | null
          visibility?: string | null
          vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospects_converted_entry_id_fkey"
            columns: ["converted_entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "prospects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_votes: {
        Row: {
          id: string
          prospect_id: string
          gent_id: string
          vote: string
          created_at: string | null
        }
        Insert: {
          id?: string
          prospect_id: string
          gent_id: string
          vote: string
          created_at?: string | null
        }
        Update: {
          id?: string
          prospect_id?: string
          gent_id?: string
          vote?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prospect_votes_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prospect_votes_gent_id_fkey"
            columns: ["gent_id"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string | null
          entry_id: string | null
          gent_id: string | null
          id: string
          reaction_type: string
        }
        Insert: {
          created_at?: string | null
          entry_id?: string | null
          gent_id?: string | null
          id?: string
          reaction_type: string
        }
        Update: {
          created_at?: string | null
          entry_id?: string | null
          gent_id?: string | null
          id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_gent_id_fkey"
            columns: ["gent_id"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "reactions_gent_id_fkey"
            columns: ["gent_id"]
            isOneToOne: false
            referencedRelation: "gents"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          entry_ids: string[] | null
          id: string
          lore: string | null
          stamp_url: string | null
          status: string | null
          subtitle: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_ids?: string[] | null
          id?: string
          lore?: string | null
          stamp_url?: string | null
          status?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          entry_ids?: string[] | null
          id?: string
          lore?: string | null
          stamp_url?: string | null
          status?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gent_stats"
            referencedColumns: ["gent_id"]
          },
          {
            foreignKeyName: "stories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gents"
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
