// Types de la base Supabase, générés automatiquement depuis le projet relié.
// Pour les régénérer après une nouvelle migration :
//   npx supabase gen types typescript --linked --schema public > src/types/database.ts
// (équivalent : npx supabase gen types typescript --project-id oqltjrtiwqpzkuoucczq)
// Attention : la commande remplace tout le fichier. Recopier ensuite les alias
// pratiques qui sont en bas du fichier.

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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      boutiques: {
        Row: {
          adresse: string | null
          code_invitation: string
          created_at: string
          entreprise_id: string
          id: string
          nom: string
        }
        Insert: {
          adresse?: string | null
          code_invitation?: string
          created_at?: string
          entreprise_id: string
          id?: string
          nom: string
        }
        Update: {
          adresse?: string | null
          code_invitation?: string
          created_at?: string
          entreprise_id?: string
          id?: string
          nom?: string
        }
        Relationships: [
          {
            foreignKeyName: "boutiques_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      entreprises: {
        Row: {
          created_at: string
          id: string
          nom: string
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
        }
        Relationships: []
      }
      ingredients_recette: {
        Row: {
          id: string
          ingredient: string
          ordre: number
          produit_id: string
          quantite: number
          unite: string
        }
        Insert: {
          id?: string
          ingredient: string
          ordre?: number
          produit_id: string
          quantite: number
          unite: string
        }
        Update: {
          id?: string
          ingredient?: string
          ordre?: number
          produit_id?: string
          quantite?: number
          unite?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_recette_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_recette_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "stock_actuel"
            referencedColumns: ["produit_id"]
          },
        ]
      }
      mouvements_stock: {
        Row: {
          created_at: string
          id: string
          jour: string
          produit_id: string
          quantite: number
          saisi_par: string
          type: Database["public"]["Enums"]["type_mouvement"]
        }
        Insert: {
          created_at?: string
          id?: string
          jour?: string
          produit_id: string
          quantite: number
          saisi_par?: string
          type: Database["public"]["Enums"]["type_mouvement"]
        }
        Update: {
          created_at?: string
          id?: string
          jour?: string
          produit_id?: string
          quantite?: number
          saisi_par?: string
          type?: Database["public"]["Enums"]["type_mouvement"]
        }
        Relationships: [
          {
            foreignKeyName: "mouvements_stock_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mouvements_stock_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "stock_actuel"
            referencedColumns: ["produit_id"]
          },
          {
            foreignKeyName: "mouvements_stock_saisi_par_fkey"
            columns: ["saisi_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          lu: boolean
          message: string
          profil_id: string
          push_envoye_le: string | null
          titre: string
        }
        Insert: {
          created_at?: string
          id?: string
          lu?: boolean
          message: string
          profil_id: string
          push_envoye_le?: string | null
          titre: string
        }
        Update: {
          created_at?: string
          id?: string
          lu?: boolean
          message?: string
          profil_id?: string
          push_envoye_le?: string | null
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      pertes_production: {
        Row: {
          created_at: string
          dans_le_stock: boolean
          id: string
          jour: string
          motif: string
          produit_id: string
          quantite: number
          saisi_par: string
        }
        Insert: {
          created_at?: string
          dans_le_stock?: boolean
          id?: string
          jour?: string
          motif: string
          produit_id: string
          quantite: number
          saisi_par?: string
        }
        Update: {
          created_at?: string
          dans_le_stock?: boolean
          id?: string
          jour?: string
          motif?: string
          produit_id?: string
          quantite?: number
          saisi_par?: string
        }
        Relationships: [
          {
            foreignKeyName: "pertes_production_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pertes_production_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "stock_actuel"
            referencedColumns: ["produit_id"]
          },
          {
            foreignKeyName: "pertes_production_saisi_par_fkey"
            columns: ["saisi_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      previsions: {
        Row: {
          calcule_le: string
          detail: Json
          fiable: boolean
          jour_fabrication: string | null
          produit_id: string
          quantite_suggeree: number | null
          stock_actuel: number
        }
        Insert: {
          calcule_le?: string
          detail: Json
          fiable: boolean
          jour_fabrication?: string | null
          produit_id: string
          quantite_suggeree?: number | null
          stock_actuel: number
        }
        Update: {
          calcule_le?: string
          detail?: Json
          fiable?: boolean
          jour_fabrication?: string | null
          produit_id?: string
          quantite_suggeree?: number | null
          stock_actuel?: number
        }
        Relationships: [
          {
            foreignKeyName: "previsions_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: true
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "previsions_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: true
            referencedRelation: "stock_actuel"
            referencedColumns: ["produit_id"]
          },
        ]
      }
      produits: {
        Row: {
          archive_le: string | null
          boutique_id: string
          conservation: Database["public"]["Enums"]["type_conservation"]
          created_at: string
          duree_conservation_jours: number | null
          fabricant_id: string
          id: string
          impose_par_admin: boolean
          intermediaire: boolean
          nom: string
          photo_url: string | null
          prix_centimes: number
          seuil_min: number
        }
        Insert: {
          archive_le?: string | null
          boutique_id: string
          conservation?: Database["public"]["Enums"]["type_conservation"]
          created_at?: string
          duree_conservation_jours?: number | null
          fabricant_id: string
          id?: string
          impose_par_admin?: boolean
          intermediaire?: boolean
          nom: string
          photo_url?: string | null
          prix_centimes: number
          seuil_min?: number
        }
        Update: {
          archive_le?: string | null
          boutique_id?: string
          conservation?: Database["public"]["Enums"]["type_conservation"]
          created_at?: string
          duree_conservation_jours?: number | null
          fabricant_id?: string
          id?: string
          impose_par_admin?: boolean
          intermediaire?: boolean
          nom?: string
          photo_url?: string | null
          prix_centimes?: number
          seuil_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "produits_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produits_fabricant_id_fkey"
            columns: ["fabricant_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      profils: {
        Row: {
          archive_le: string | null
          boutique_id: string | null
          created_at: string
          entreprise_id: string
          equipe: string | null
          id: string
          information_rgpd_acceptee_le: string | null
          nom: string
          photo_url: string | null
          prenom: string
          role: Database["public"]["Enums"]["role_employe"]
        }
        Insert: {
          archive_le?: string | null
          boutique_id?: string | null
          created_at?: string
          entreprise_id: string
          equipe?: string | null
          id: string
          information_rgpd_acceptee_le?: string | null
          nom: string
          photo_url?: string | null
          prenom: string
          role: Database["public"]["Enums"]["role_employe"]
        }
        Update: {
          archive_le?: string | null
          boutique_id?: string | null
          created_at?: string
          entreprise_id?: string
          equipe?: string | null
          id?: string
          information_rgpd_acceptee_le?: string | null
          nom?: string
          photo_url?: string | null
          prenom?: string
          role?: Database["public"]["Enums"]["role_employe"]
        }
        Relationships: [
          {
            foreignKeyName: "profils_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profils_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          jeton: string
          plateforme: string | null
          profil_id: string
          vu_le: string
        }
        Insert: {
          created_at?: string
          id?: string
          jeton: string
          plateforme?: string | null
          profil_id: string
          vu_le?: string
        }
        Update: {
          created_at?: string
          id?: string
          jeton?: string
          plateforme?: string | null
          profil_id?: string
          vu_le?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_profil_id_fkey"
            columns: ["profil_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
      saisies_vente: {
        Row: {
          fabricant_id: string
          id: string
          jete: number
          jour: string
          modifie_le: string
          prix_unitaire_centimes: number
          produit_id: string
          reste: number
          saisi_par: string
          vendu: number
        }
        Insert: {
          fabricant_id: string
          id?: string
          jete?: number
          jour?: string
          modifie_le?: string
          prix_unitaire_centimes: number
          produit_id: string
          reste?: number
          saisi_par?: string
          vendu?: number
        }
        Update: {
          fabricant_id?: string
          id?: string
          jete?: number
          jour?: string
          modifie_le?: string
          prix_unitaire_centimes?: number
          produit_id?: string
          reste?: number
          saisi_par?: string
          vendu?: number
        }
        Relationships: [
          {
            foreignKeyName: "saisies_vente_fabricant_id_fkey"
            columns: ["fabricant_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saisies_vente_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saisies_vente_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "stock_actuel"
            referencedColumns: ["produit_id"]
          },
          {
            foreignKeyName: "saisies_vente_saisi_par_fkey"
            columns: ["saisi_par"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      ca_journalier: {
        Row: {
          boutique_id: string | null
          ca_centimes: number | null
          fabricant_id: string | null
          jete: number | null
          jour: string | null
          prix_unitaire_centimes: number | null
          produit_id: string | null
          produit_nom: string | null
          reste: number | null
          vendu: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saisies_vente_fabricant_id_fkey"
            columns: ["fabricant_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saisies_vente_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saisies_vente_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "stock_actuel"
            referencedColumns: ["produit_id"]
          },
        ]
      }
      stock_actuel: {
        Row: {
          boutique_id: string | null
          fabricant_id: string | null
          nom: string | null
          produit_id: string | null
          seuil_min: number | null
          stock: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produits_fabricant_id_fkey"
            columns: ["fabricant_id"]
            isOneToOne: false
            referencedRelation: "profils"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      ajuster_stock: {
        Args: { p_motif?: string; p_produit: string; p_stock_reel: number }
        Returns: number
      }
      aujourdhui: { Args: never; Returns: string }
      boutique_de_mon_entreprise: {
        Args: { p_boutique: string }
        Returns: boolean
      }
      calculer_previsions: { Args: never; Returns: undefined }
      catalogue_boutiques: {
        Args: never
        Returns: {
          id: string
          nom: string
        }[]
      }
      catalogue_produits: {
        Args: { p_boutique: string }
        Returns: {
          conservation: Database["public"]["Enums"]["type_conservation"]
          duree_conservation_jours: number
          id: string
          intermediaire: boolean
          nom: string
          photo_url: string
          prix_centimes: number
        }[]
      }
      catalogue_recette: {
        Args: { p_produit: string }
        Returns: {
          ingredient: string
          ordre: number
          quantite: number
          unite: string
        }[]
      }
      chemin_photo_uuid: {
        Args: { p_dossier: string; p_nom: string }
        Returns: string
      }
      creer_entreprise: {
        Args: {
          p_nom: string
          p_nom_boutique?: string
          p_nom_entreprise: string
          p_prenom: string
        }
        Returns: string
      }
      enregistrer_jeton_push: {
        Args: { p_jeton: string; p_plateforme: string }
        Returns: undefined
      }
      est_admin: { Args: never; Returns: boolean }
      ma_boutique: { Args: never; Returns: string }
      mon_entreprise: { Args: never; Returns: string }
      mon_role: {
        Args: never
        Returns: Database["public"]["Enums"]["role_employe"]
      }
      peut_ecrire_photo_produit: {
        Args: { p_boutique: string }
        Returns: boolean
      }
      peut_lire_photo_profil: { Args: { p_profil: string }; Returns: boolean }
      peut_modifier_produit: { Args: { p_produit: string }; Returns: boolean }
      peut_voir_boutique: { Args: { p_boutique: string }; Returns: boolean }
      peut_voir_produit: { Args: { p_produit: string }; Returns: boolean }
      produit_boutique: { Args: { p_produit: string }; Returns: string }
      rejoindre_boutique: {
        Args: {
          p_code: string
          p_equipe?: string
          p_nom: string
          p_prenom: string
          p_role: Database["public"]["Enums"]["role_employe"]
        }
        Returns: string
      }
      supprimer_jeton_push: { Args: { p_jeton: string }; Returns: undefined }
    }
    Enums: {
      role_employe: "admin" | "patissier" | "vendeuse"
      type_conservation: "frais" | "surgele"
      type_mouvement: "production" | "sortie" | "ajustement"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      role_employe: ["admin", "patissier", "vendeuse"],
      type_conservation: ["frais", "surgele"],
      type_mouvement: ["production", "sortie", "ajustement"],
    },
  },
} as const

// ---------- Alias pratiques ----------
export type Produit = Tables<'produits'>;
export type Profil = Tables<'profils'>;
export type Boutique = Tables<'boutiques'>;
export type MouvementStock = Tables<'mouvements_stock'>;
export type SaisieVente = Tables<'saisies_vente'>;
export type Prevision = Tables<'previsions'>;
export type Notification = Tables<'notifications'>;
export type StockActuel = Tables<'stock_actuel'>;
export type CaJournalier = Tables<'ca_journalier'>;
export type PerteProduction = Tables<'pertes_production'>;
export type RoleEmploye = Enums<'role_employe'>;
