import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 5 * 1024 * 1024;

export type SchoolMediaKind = "logo" | "students" | "guardians" | "teachers";

/**
 * Upload an image into the school-media bucket.
 * Object path: `{schoolId}/{kind}/{uuid}.{ext}`
 */
export async function uploadSchoolMedia(input: {
  supabase: SupabaseClient;
  schoolId: string;
  kind: SchoolMediaKind;
  file: File;
}): Promise<{ ok: true; publicUrl: string } | { ok: false; error: string }> {
  const { supabase, schoolId, kind, file } = input;
  if (!file || file.size === 0) {
    return { ok: false, error: "Choose an image file." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be 5 MB or smaller." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: "Use a JPEG, PNG, WebP, or GIF image." };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";
  const path = `${schoolId}/${kind}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from("school-media")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return {
      ok: false,
      error: error.message || "Could not upload the image.",
    };
  }

  const { data } = supabase.storage.from("school-media").getPublicUrl(path);
  if (!data.publicUrl) {
    return { ok: false, error: "Could not resolve the uploaded image URL." };
  }

  return { ok: true, publicUrl: data.publicUrl };
}
