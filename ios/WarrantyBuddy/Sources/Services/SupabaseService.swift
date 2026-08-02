import Foundation
import Supabase

// Single shared client for the whole app, same pattern as the web app's
// src/lib/supabase/client.ts (one browser client reused everywhere).
enum SupabaseService {
    static let client = SupabaseClient(
        supabaseURL: Config.supabaseURL,
        supabaseKey: Config.supabaseAnonKey,
        options: SupabaseClientOptions(
            auth: SupabaseClientOptions.AuthOptions(emitLocalSessionAsInitialSession: true)
        )
    )
}
