import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

const BUCKET = "product-documents";

function buildPath(userId: string, productId: string, fileName: string) {
  const uuid = crypto.randomUUID();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${userId}/${productId}/${uuid}-${safeName}`;
}

export async function uploadProductFile(
  supabase: SupabaseClient<Database>,
  params: { userId: string; productId: string; file: File },
) {
  const path = buildPath(params.userId, params.productId, params.file.name);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, params.file, { contentType: params.file.type, upsert: false });

  if (error) throw error;
  return path;
}

export async function getSignedUrl(
  supabase: SupabaseClient<Database>,
  path: string,
  expiresInSeconds = 3600,
) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error) throw error;
  return data.signedUrl;
}

export async function removeProductFile(
  supabase: SupabaseClient<Database>,
  path: string,
) {
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function downloadProductFile(
  supabase: SupabaseClient<Database>,
  path: string,
) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

// For files that arrive before a product exists yet (inbound email
// attachments landing in the Review Queue) — stored under {user_id}/inbox/
// so the same RLS policies (keyed on the first path segment) still apply
// once the product/user reads it back.
export async function uploadInboxFile(
  supabase: SupabaseClient<Database>,
  params: { userId: string; fileName: string; contentType: string; data: Buffer },
) {
  const uuid = crypto.randomUUID();
  const safeName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${params.userId}/inbox/${uuid}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, params.data, { contentType: params.contentType, upsert: false });

  if (error) throw error;
  return path;
}
