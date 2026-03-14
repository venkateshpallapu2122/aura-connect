import { supabase } from "@/integrations/supabase/client";

/**
 * Get a signed URL for a file in the chat-media bucket.
 * Falls back to the raw path if signing fails.
 */
export async function getSignedMediaUrl(filePath: string): Promise<string> {
  // If it's already a full URL, extract the path
  const bucketPrefix = "/storage/v1/object/public/chat-media/";
  let path = filePath;
  
  if (filePath.includes(bucketPrefix)) {
    path = filePath.split(bucketPrefix)[1];
  } else if (filePath.startsWith("http")) {
    // Try to extract path from full URL
    try {
      const url = new URL(filePath);
      const idx = url.pathname.indexOf(bucketPrefix);
      if (idx !== -1) {
        path = url.pathname.substring(idx + bucketPrefix.length);
      } else {
        // Not a storage URL, return as-is
        return filePath;
      }
    } catch {
      return filePath;
    }
  }

  const { data, error } = await supabase.storage
    .from("chat-media")
    .createSignedUrl(path, 3600); // 1 hour

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return filePath;
  }

  return data.signedUrl;
}

/**
 * Upload a file to chat-media and return a signed URL.
 */
export async function uploadAndGetSignedUrl(
  userId: string,
  file: Blob,
  fileName: string
): Promise<string> {
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-media")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) throw uploadError;

  return getSignedMediaUrl(filePath);
}
