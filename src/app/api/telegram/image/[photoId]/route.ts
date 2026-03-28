import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  const { photoId } = await params;

  // Check auth or shared access
  const session = await auth();
  const isSharedAccess = req.headers.get("x-shared-access") === "true";

  if (!session?.user?.id && !isSharedAccess) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [photo] = await db
    .select()
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1);

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
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
