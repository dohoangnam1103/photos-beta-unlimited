import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, and, or, lt, sql } from "drizzle-orm";

/**
 * Retry failed/stuck photo uploads to Telegram.
 * Finds photos with status "failed" or "processing" (stuck > 10 min)
 * and re-triggers the worker webhook.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  // Find failed or stuck photos
  const stuckPhotos = await db
    .select()
    .from(photos)
    .where(
      and(
        eq(photos.userId, session.user.id),
        or(
          eq(photos.status, "failed"),
          and(
            eq(photos.status, "processing"),
            lt(photos.uploadedAt, tenMinutesAgo)
          )
        )
      )
    );

  if (stuckPhotos.length === 0) {
    return NextResponse.json({ retried: 0, message: "Không có ảnh nào cần retry" });
  }

  const workerUrl = process.env.WORKER_WEBHOOK_URL;
  const callbackSecret = process.env.WORKER_CALLBACK_SECRET;

  if (!workerUrl || !callbackSecret) {
    return NextResponse.json(
      { error: "Worker not configured" },
      { status: 500 }
    );
  }

  let retried = 0;

  for (const photo of stuckPhotos) {
    if (!photo.uploadthingUrl) continue;

    // Reset status to processing
    await db
      .update(photos)
      .set({ status: "processing" })
      .where(eq(photos.id, photo.id));

    try {
      await fetch(workerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${callbackSecret}`,
        },
        body: JSON.stringify({
          photoId: photo.id,
          uploadthingUrl: photo.uploadthingUrl,
          uploadthingKey: photo.uploadthingKey,
          callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/telegram-callback`,
        }),
      });
      retried++;
    } catch {
      // Mark as failed again if worker is unreachable
      await db
        .update(photos)
        .set({ status: "failed" })
        .where(eq(photos.id, photo.id));
    }
  }

  return NextResponse.json({
    retried,
    total: stuckPhotos.length,
    message: `Đã retry ${retried}/${stuckPhotos.length} ảnh`,
  });
}
