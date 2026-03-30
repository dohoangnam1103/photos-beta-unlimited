import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos, albumPhotos, sharedLinks } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Serve photo images with proper authorization.
 *
 * Access is granted if:
 * 1. User is authenticated AND owns the photo, OR
 * 2. Photo belongs to an album with an active shared link (public shared access)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;

  const session = await auth();

  // Rate limit by userId (authenticated) or IP (anonymous/shared)
  const identifier = session?.user?.id || `ip:${getClientIp(req)}`;
  const limited = await rateLimit(identifier, "relaxed");
  if (limited) return limited;

  const [photo] = await db
    .select()
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // Authorization check
  const isOwner = session?.user?.id && photo.userId === session.user.id;

  if (!isOwner) {
    // Check if photo belongs to any publicly shared album
    const isShared = await isPhotoInSharedAlbum(photoId);
    if (!isShared) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // If has telegram file id, fetch from Telegram
  if (photo.telegramFileId) {
    try {
      const botToken = process.env.TELEGRAM_BOT_TOKEN!;

      // Get file path
      const fileRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${photo.telegramFileId}`
      );
      const fileData = await fileRes.json();

      if (!fileData.ok || !fileData.result?.file_path) {
        throw new Error("Failed to get Telegram file path");
      }

      // Download from Telegram
      const imageRes = await fetch(
        `https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`
      );

      if (!imageRes.ok) throw new Error("Failed to download from Telegram");

      const imageBuffer = await imageRes.arrayBuffer();

      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": photo.mimeType || "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      // Fallback to uploadthing URL
      if (photo.uploadthingUrl) {
        return NextResponse.redirect(photo.uploadthingUrl);
      }
    }
  }

  // Fallback: redirect to UploadThing URL
  if (photo.uploadthingUrl) {
    return NextResponse.redirect(photo.uploadthingUrl);
  }

  return NextResponse.json({ error: "No image source available" }, { status: 404 });
}

/**
 * Check if a photo belongs to any album with an active shared link.
 * This replaces the insecure x-shared-access header approach.
 */
async function isPhotoInSharedAlbum(photoId: string): Promise<boolean> {
  const result = await db
    .select({ id: sharedLinks.id })
    .from(albumPhotos)
    .innerJoin(
      sharedLinks,
      and(
        eq(sharedLinks.albumId, albumPhotos.albumId),
        eq(sharedLinks.isActive, true)
      )
    )
    .where(eq(albumPhotos.photoId, photoId))
    .limit(1);

  return result.length > 0;
}
