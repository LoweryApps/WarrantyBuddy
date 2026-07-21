import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "product-documents";
const PAGE_SIZE = 100;

// Supabase Storage's list() caps out at 100 entries per call (the default
// and max `limit`), so a user with more than 100 product folders — or more
// than 100 files in one folder — would silently leave files behind on
// account deletion. Page through with offset until a short page signals
// there's nothing left.
async function listAll(
  admin: ReturnType<typeof createAdminClient>,
  path: string,
): Promise<string[]> {
  const names: string[] = [];
  let offset = 0;

  for (;;) {
    const { data, error } = await admin.storage.from(BUCKET).list(path, { limit: PAGE_SIZE, offset });
    if (error) {
      console.error(`account/delete: failed to list storage at "${path}":`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    names.push(...data.map((entry) => entry.name));
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return names;
}

async function deleteUserStorage(userId: string) {
  const admin = createAdminClient();
  const productFolders = await listAll(admin, userId);

  const filesToRemove: string[] = [];
  for (const folderName of productFolders) {
    const files = await listAll(admin, `${userId}/${folderName}`);
    for (const fileName of files) {
      filesToRemove.push(`${userId}/${folderName}/${fileName}`);
    }
  }

  if (filesToRemove.length > 0) {
    const { error } = await admin.storage.from(BUCKET).remove(filesToRemove);
    if (error) {
      console.error(`account/delete: failed to remove ${filesToRemove.length} file(s) for user ${userId}:`, error.message);
    }
  }
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  await deleteUserStorage(user.id);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
