import Foundation

// Mirrors the web app's NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// (see .env.local at the repo root). The anon key is safe to embed — it's
// powerless without the RLS policies already enforced on every table.
enum Config {
    static let supabaseURL = URL(string: "https://qveiksuskpyqkfcnfbtw.supabase.co")!
    static let supabaseAnonKey = "sb_publishable_bQD-AZ9PGuWQQwqFwUZIYw_qqKYb912"
}
