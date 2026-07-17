import { createHash } from "crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const BLOG_THUMBNAIL_BUCKET = "blog-thumbnails";
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function isSupabaseBlogThumbnailUrl(url: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(
    supabaseUrl &&
      url.startsWith(`${supabaseUrl}/storage/v1/object/public/${BLOG_THUMBNAIL_BUCKET}/`)
  );
}

function extensionFromContentType(contentType: string | null) {
  const cleanType = contentType?.split(";")[0]?.trim().toLowerCase();
  if (cleanType === "image/png") return "png";
  if (cleanType === "image/webp") return "webp";
  if (cleanType === "image/gif") return "gif";
  return "jpg";
}

async function ensureBlogThumbnailBucket() {
  const admin = getSupabaseAdmin();
  const { data } = await admin.storage.getBucket(BLOG_THUMBNAIL_BUCKET);
  if (data) return;

  const { error } = await admin.storage.createBucket(BLOG_THUMBNAIL_BUCKET, {
    public: true,
    fileSizeLimit: MAX_IMAGE_BYTES,
    allowedMimeTypes: Array.from(ALLOWED_CONTENT_TYPES),
  });

  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

async function downloadImage(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; CourtsKoreaPreview/1.0; +https://courtskorea.com)",
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*,*/*;q=0.8",
        Referer: "https://blog.naver.com/",
      },
    });

    if (!response.ok) return null;

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (contentType && !ALLOWED_CONTENT_TYPES.has(contentType)) return null;

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null;

    return {
      buffer,
      contentType: contentType && ALLOWED_CONTENT_TYPES.has(contentType) ? contentType : "image/jpeg",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function storeBlogThumbnail(thumbnailUrl: string | null | undefined) {
  if (!thumbnailUrl) return null;

  let normalizedUrl: string;
  try {
    normalizedUrl = new URL(thumbnailUrl).toString();
  } catch {
    return null;
  }

  if (isSupabaseBlogThumbnailUrl(normalizedUrl)) {
    return normalizedUrl;
  }

  const image = await downloadImage(normalizedUrl);
  if (!image) return normalizedUrl;

  await ensureBlogThumbnailBucket();

  const hash = createHash("sha256").update(normalizedUrl).digest("hex");
  const extension = extensionFromContentType(image.contentType);
  const path = `${hash}.${extension}`;
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage
    .from(BLOG_THUMBNAIL_BUCKET)
    .upload(path, image.buffer, {
      contentType: image.contentType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) return normalizedUrl;

  const { data } = admin.storage.from(BLOG_THUMBNAIL_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
