import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "product-documents";

async function deleteUserStorage(userId: string) {
  const admin = createAdminClient();
  const { data: productFolders } = await admin.storage.from(BUCKET).list(userId);

  const filesToRemove: string[] = [];
  for (const folder of productFolders ?? []) {
    const { data: files } = await admin.storage.from(BUCKET).list(`${userId}/${folder.name}`);
    for (const file of files ?? []) {
      filesToRemove.push(`${userId}/${folder.name}/${file.name}`);
    }
  }

  if (filesToRemove.length > 0) {
    await admin.storage.from(BUCKET).remove(filesToRemove);
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
