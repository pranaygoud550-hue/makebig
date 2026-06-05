/**
 * Generated from supabase/schema.sql — regenerate with:
 * npx supabase gen types typescript --project-id YOUR_REF > lib/database.types.ts
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      pricing_interest: {
        Row: {
          id: string;
          contact: string;
          plan: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          contact: string;
          plan?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          contact?: string;
          plan?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          legacy_mongo_id: string | null;
          name: string;
          contact: string;
          skills: string[];
          hobbies: string[];
          college: string;
          graduation_year: string;
          city: string;
          state: string;
          last_active: string | null;
          plan: 'free' | 'pro';
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          legacy_mongo_id?: string | null;
          name: string;
          contact: string;
          skills?: string[];
          hobbies?: string[];
          college?: string;
          graduation_year?: string;
          city?: string;
          state?: string;
          last_active?: string | null;
          plan?: 'free' | 'pro';
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          user_id: string | null;
          contact: string;
          role: string;
          tagline: string;
          category_ids: string[];
          skills: string[];
          rate_min: number | null;
          rate_max: number | null;
          currency: string;
          available_for_invites: boolean;
          bio: string;
          portfolio: string;
          profile_image: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          contact: string;
          role?: string;
          tagline?: string;
          category_ids?: string[];
          skills?: string[];
          rate_min?: number | null;
          rate_max?: number | null;
          currency?: string;
          available_for_invites?: boolean;
          bio?: string;
          portfolio?: string;
          profile_image?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      projects: {
        Row: {
          id: string;
          legacy_mongo_id: string | null;
          owner_user_id: string | null;
          owner_contact: string;
          category_id: string;
          name: string;
          description: string;
          roles: string[];
          team_size: number;
          deadline: string | null;
          vision: string;
          salary_min: number;
          salary_max: number;
          currency: string;
          city: string;
          state: string;
          slug: string | null;
          status: string;
          visibility: string;
          project_purpose: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          legacy_mongo_id?: string | null;
          owner_user_id?: string | null;
          owner_contact: string;
          category_id: string;
          name: string;
          description?: string;
          roles?: string[];
          team_size?: number;
          deadline?: string | null;
          vision?: string;
          salary_min?: number;
          salary_max?: number;
          currency?: string;
          city?: string;
          state?: string;
          slug?: string | null;
          status?: string;
          visibility?: string;
          project_purpose?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string | null;
          contact: string;
          role: string;
          status: string;
          joined_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id?: string | null;
          contact: string;
          role?: string;
          status?: string;
          joined_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['project_members']['Insert']>;
      };
      invites: {
        Row: {
          id: string;
          project_id: string | null;
          sender_contact: string;
          receiver_contact: string;
          role: string;
          message: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          sender_contact: string;
          receiver_contact: string;
          role?: string;
          message?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invites']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string | null;
          user_contact: string;
          type: string;
          title: string;
          message: string;
          read: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          user_contact?: string;
          type: string;
          title: string;
          message: string;
          read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      activities: {
        Row: {
          id: string;
          project_id: string | null;
          user_id: string;
          type: string;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          user_id?: string;
          type: string;
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['activities']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          project_id: string;
          sender_id: string;
          sender_name: string;
          sender_contact: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          sender_id: string;
          sender_name: string;
          sender_contact?: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      posts: {
        Row: {
          id: string;
          project_id: string | null;
          author_contact: string;
          body: string;
          image_url: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          author_contact: string;
          body: string;
          image_url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['posts']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_contact: { Args: Record<string, never>; Returns: string };
      is_project_member: { Args: { project_uuid: string }; Returns: boolean };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type UserRow = Tables<'users'>;
export type ProfileRow = Tables<'profiles'>;
export type ProjectRow = Tables<'projects'>;
export type InviteRow = Tables<'invites'>;
export type NotificationRow = Tables<'notifications'>;
