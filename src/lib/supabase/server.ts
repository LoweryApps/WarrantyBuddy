import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";

// Authenticates a request from either source: a browser (cookie-based
// session, via createClient() below) or the native iOS app (no cookie jar
// to share, so it sends its Supabase session's access token as a Bearer
// header instead). The returned client carries the resolved user's own JWT
// on every request, so RLS (auth.uid()) resolves correctly either way —
// this never uses the service role.
export async function getUserFromRequest(
  request: Request,
): Promise<{ user: User; supabase: ReturnType<typeof createSupabaseClient<Database>> } | null> {
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.match(/^Bearer (.+)$/)?.[1];

  if (bearerToken) {
    const supabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${bearerToken}` } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(bearerToken);
    if (!user) return null;
    return { user, supabase };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user, supabase };
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll called from a Server Component — safe to ignore because
            // the middleware refreshes the session on every request.
          }
        },
      },
    },
  );
}
