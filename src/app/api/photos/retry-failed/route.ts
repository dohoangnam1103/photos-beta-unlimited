import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, and, or, lt, inArray } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Silent retry for failed/stuck photo uploads.
 * Uses status "retrying" to prevent duplicate worker triggers.
 *
 * Status flow:
 *   upload -> "processing" -> worker success -> "ready"
 *                          -> worker fail    -> "failed"
 *   auto-retry -> "retrying" -> worker success -> "ready"
 *                            -> worker fail    -> "failed"
 *
 * Only picks:
 *   - "failed" photos (always)
 *   - "processing" photos stuck > 15 min (worker probably crashed)
 * Never picks:
 *   - "retrying" (already being retried)
 *   - "processing" < 15 min (worker might still be working)
 *   - "ready" (already done)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Strict rate limit: retry is expensive (triggers external workers)
  const limited = await rateLimit(session.user.id, "strict");
  if (limited) return limited;

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  // Find photos that need retry (exclude "retrying" to prevent duplicates)
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
            lt(photos.uploadedAt, fifteenMinutesAgo)
          )
        )
      )
    );

  if (stuckPhotos.length === 0) {
    return NextResponse.json({ retried: 0 });
  }

  const workerUrl = process.env.WORKER_WEBHOOK_URL;
  const callbackSecret = process.env.WORKER_CALLBACK_SECRET;

  if (!workerUrl || !callbackSecret) {
    return NextResponse.json({ retried: 0 });
  }

  // Mark ALL as "retrying" first (atomic, prevents race condition)
  const photoIds = stuckPhotos.map((p) => p.id);
  await db
    .update(photos)
    .set({ status: "retrying" })
    .where(inArray(photos.id, photoIds));

  let retried = 0;

  for (const photo of stuckPhotos) {
    if (!photo.uploadthingUrl) continue;

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
      // Worker unreachable - set back to failed for next retry
      await db
        .update(photos)
        .set({ status: "failed" })
        .where(eq(photos.id, photo.id));
    }
  }

  return NextResponse.json({ retried });
}
