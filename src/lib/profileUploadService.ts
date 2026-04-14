/**
 * Supabase Storage upload service for profile avatar and banner.
 * Falls back to base64 localStorage if storage upload fails.
 */

import { supabase } from "./supabase";

const AVATAR_BUCKET = "profile-avatars";
const BANNER_BUCKET = "profile-banners";
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadResult {
  url: string;
  source: "supabase" | "local";
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Unsupported format. Use JPG, PNG, WebP, or GIF.";
  }
  if (file.size > MAX_BYTES) {
    return "File exceeds 5 MB limit.";
  }
  return null;
}

async function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function uploadToStorage(
  bucket: string,
  userId: string,
  file: File,
): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) return null;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl ?? null;
}

export async function uploadAvatar(
  userId: string,
  file: File,
): Promise<UploadResult> {
  const err = validateFile(file);
  if (err) throw new Error(err);

  const remoteUrl = await uploadToStorage(AVATAR_BUCKET, userId, file);
  if (remoteUrl) return { url: remoteUrl, source: "supabase" };

  // Fallback: base64 data URL
  const dataUrl = await readAsDataURL(file);
  return { url: dataUrl, source: "local" };
}

export async function uploadBanner(
  userId: string,
  file: File,
): Promise<UploadResult> {
  const err = validateFile(file);
  if (err) throw new Error(err);

  const remoteUrl = await uploadToStorage(BANNER_BUCKET, userId, file);
  if (remoteUrl) return { url: remoteUrl, source: "supabase" };

  // Fallback: base64 data URL
  const dataUrl = await readAsDataURL(file);
  return { url: dataUrl, source: "local" };
}
