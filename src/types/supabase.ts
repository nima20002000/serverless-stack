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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      _ProductToTag: {
        Row: {
          A: string
          B: string
        }
        Insert: {
          A: string
          B: string
        }
        Update: {
          A?: string
          B?: string
        }
        Relationships: [
          {
            foreignKeyName: "_ProductToTag_A_fkey"
            columns: ["A"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "_ProductToTag_B_fkey"
            columns: ["B"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          createdAt: string
          description: string | null
          id: string
          image: string | null
          isActive: boolean
          name: string
          parentId: string | null
          slug: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          id: string
          image?: string | null
          isActive?: boolean
          name: string
          parentId?: string | null
          slug: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          id?: string
          image?: string | null
          isActive?: boolean
          name?: string
          parentId?: string | null
          slug?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parentId_fkey"
            columns: ["parentId"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          generatedAt: string
          id: string
          invoiceNumber: string
          pdfUrl: string | null
          transactionId: string
        }
        Insert: {
          generatedAt?: string
          id: string
          invoiceNumber: string
          pdfUrl?: string | null
          transactionId: string
        }
        Update: {
          generatedAt?: string
          id?: string
          invoiceNumber?: string
          pdfUrl?: string | null
          transactionId?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_transactionId_fkey"
            columns: ["transactionId"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_verifications: {
        Row: {
          attempts: number
          code: string
          createdAt: string
          expiresAt: string
          id: string
          identifier: string
          maxAttempts: number
          purpose: string
        }
        Insert: {
          attempts?: number
          code: string
          createdAt?: string
          expiresAt: string
          id: string
          identifier: string
          maxAttempts?: number
          purpose: string
        }
        Update: {
          attempts?: number
          code?: string
          createdAt?: string
          expiresAt?: string
          id?: string
          identifier?: string
          maxAttempts?: number
          purpose?: string
        }
        Relationships: []
      }
      product_media: {
        Row: {
          alt: string | null
          createdAt: string
          id: string
          isDefault: boolean | null
          order: number
          productId: string
          type: Database["public"]["Enums"]["MediaType"]
          url: string
          variantId: string | null
        }
        Insert: {
          alt?: string | null
          createdAt?: string
          id: string
          isDefault?: boolean | null
          order?: number
          productId: string
          type: Database["public"]["Enums"]["MediaType"]
          url: string
          variantId?: string | null
        }
        Update: {
          alt?: string | null
          createdAt?: string
          id?: string
          isDefault?: boolean | null
          order?: number
          productId?: string
          type?: Database["public"]["Enums"]["MediaType"]
          url?: string
          variantId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_variantId_fkey"
            columns: ["variantId"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          color: string | null
          createdAt: string
          id: string
          isActive: boolean
          material: string | null
          name: string
          order: number
          priceAdjust: number
          productId: string
          size: string | null
          sku: string | null
          stock: number
          updatedAt: string
        }
        Insert: {
          color?: string | null
          createdAt?: string
          id: string
          isActive?: boolean
          material?: string | null
          name: string
          order?: number
          priceAdjust?: number
          productId: string
          size?: string | null
          sku?: string | null
          stock?: number
          updatedAt: string
        }
        Update: {
          color?: string | null
          createdAt?: string
          id?: string
          isActive?: boolean
          material?: string | null
          name?: string
          order?: number
          priceAdjust?: number
          productId?: string
          size?: string | null
          sku?: string | null
          stock?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categoryId: string | null
          createdAt: string
          description: string
          discountPercent: number | null
          displayOrder: number
          hasVariants: boolean
          id: string
          images: string[] | null
          isActive: boolean
          isFeatured: boolean
          name: string
          price: number
          stock: number
          updatedAt: string
        }
        Insert: {
          categoryId?: string | null
          createdAt?: string
          description: string
          discountPercent?: number | null
          displayOrder?: number
          hasVariants?: boolean
          id: string
          images?: string[] | null
          isActive?: boolean
          isFeatured?: boolean
          name: string
          price: number
          stock?: number
          updatedAt: string
        }
        Update: {
          categoryId?: string | null
          createdAt?: string
          description?: string
          discountPercent?: number | null
          displayOrder?: number
          hasVariants?: boolean
          id?: string
          images?: string[] | null
          isActive?: boolean
          isFeatured?: boolean
          name?: string
          price?: number
          stock?: number
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          createdAt: string
          expiresAt: string
          id: string
          isUsed: boolean
          userId: string
        }
        Insert: {
          code: string
          createdAt?: string
          expiresAt: string
          id: string
          isUsed?: boolean
          userId: string
        }
        Update: {
          code?: string
          createdAt?: string
          expiresAt?: string
          id?: string
          isUsed?: boolean
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updatedAt: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updatedAt?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updatedAt?: string
          value?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          createdAt: string
          id: string
          name: string
          slug: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          id: string
          name: string
          slug: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          id?: string
          name?: string
          slug?: string
          updatedAt?: string
        }
        Relationships: []
      }
      transaction_items: {
        Row: {
          id: string
          price: number
          productId: string
          quantity: number
          transactionId: string
          variantId: string | null
        }
        Insert: {
          id: string
          price: number
          productId: string
          quantity: number
          transactionId: string
          variantId?: string | null
        }
        Update: {
          id?: string
          price?: number
          productId?: string
          quantity?: number
          transactionId?: string
          variantId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_items_productId_fkey"
            columns: ["productId"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_transactionId_fkey"
            columns: ["transactionId"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_items_variantid_fkey"
            columns: ["variantId"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          createAccount: boolean | null
          createdAt: string
          digipayTicket: string | null
          digipayTrackingCode: string | null
          email: string | null
          fullName: string | null
          id: string
          isGuest: boolean
          paymentMethod: Database["public"]["Enums"]["PaymentMethod"]
          phone: string | null
          postalCode: string | null
          shippingAddress: string | null
          status: Database["public"]["Enums"]["TransactionStatus"]
          transactionCode: string
          updatedAt: string
          userId: string | null
          zarinpalAuthority: string | null
          zarinpalRefId: string | null
        }
        Insert: {
          amount: number
          createAccount?: boolean | null
          createdAt?: string
          digipayTicket?: string | null
          digipayTrackingCode?: string | null
          email?: string | null
          fullName?: string | null
          id: string
          isGuest?: boolean
          paymentMethod?: Database["public"]["Enums"]["PaymentMethod"]
          phone?: string | null
          postalCode?: string | null
          shippingAddress?: string | null
          status?: Database["public"]["Enums"]["TransactionStatus"]
          transactionCode: string
          updatedAt: string
          userId?: string | null
          zarinpalAuthority?: string | null
          zarinpalRefId?: string | null
        }
        Update: {
          amount?: number
          createAccount?: boolean | null
          createdAt?: string
          digipayTicket?: string | null
          digipayTrackingCode?: string | null
          email?: string | null
          fullName?: string | null
          id?: string
          isGuest?: boolean
          paymentMethod?: Database["public"]["Enums"]["PaymentMethod"]
          phone?: string | null
          postalCode?: string | null
          shippingAddress?: string | null
          status?: Database["public"]["Enums"]["TransactionStatus"]
          transactionCode?: string
          updatedAt?: string
          userId?: string | null
          zarinpalAuthority?: string | null
          zarinpalRefId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          createdAt: string
          email: string | null
          id: string
          isVerified: boolean
          name: string
          password: string | null
          phone: string | null
          postalCode: string | null
          role: Database["public"]["Enums"]["Role"]
          shippingAddress: string | null
          uid: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          email?: string | null
          id: string
          isVerified?: boolean
          name: string
          password?: string | null
          phone?: string | null
          postalCode?: string | null
          role?: Database["public"]["Enums"]["Role"]
          shippingAddress?: string | null
          uid: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          email?: string | null
          id?: string
          isVerified?: boolean
          name?: string
          password?: string | null
          phone?: string | null
          postalCode?: string | null
          role?: Database["public"]["Enums"]["Role"]
          shippingAddress?: string | null
          uid?: string
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      MediaType: "IMAGE" | "VIDEO"
      PaymentMethod: "ZARINPAL" | "DIGIPAY"
      Role: "USER" | "ADMIN"
      TransactionStatus: "PENDING" | "COMPLETED" | "FAILED"
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
    Enums: {
      MediaType: ["IMAGE", "VIDEO"],
      PaymentMethod: ["ZARINPAL", "DIGIPAY"],
      Role: ["USER", "ADMIN"],
      TransactionStatus: ["PENDING", "COMPLETED", "FAILED"],
    },
  },
} as const
