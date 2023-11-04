export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          color_hex: string;
          id: string;
          name: string | null;
          type: Database["public"]["Enums"]["subscription_category"];
        };
        Insert: {
          color_hex: string;
          id?: string;
          name?: string | null;
          type: Database["public"]["Enums"]["subscription_category"];
        };
        Update: {
          color_hex?: string;
          id?: string;
          name?: string | null;
          type?: Database["public"]["Enums"]["subscription_category"];
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          billed_at: string;
          category_id: string | null;
          created_at: string;
          description: string | null;
          id: string;
          interval: Database["public"]["Enums"]["interval_enum"];
          name: string;
          price: number;
          user_id: string;
        };
        Insert: {
          billed_at: string;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          interval?: Database["public"]["Enums"]["interval_enum"];
          name: string;
          price: number;
          user_id: string;
        };
        Update: {
          billed_at?: string;
          category_id?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          interval?: Database["public"]["Enums"]["interval_enum"];
          name?: string;
          price?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      interval: "week" | "month" | "year";
      interval_enum: "week" | "month" | "year";
      subscription_category:
        | "entertainment"
        | "utilities"
        | "productivity"
        | "health_and_fitness"
        | "transport";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
