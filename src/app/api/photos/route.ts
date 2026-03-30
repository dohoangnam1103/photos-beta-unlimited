import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, desc, sql, isNull, and } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const MAX_PAGE_LIMIT = 100;

const createPhotoSchema = z.object({
  photos: z
    .array(
      z.object({
        originalFilename: z.string().max(500),
        fileHash: z.string().max(128),
        uploadthingUrl: z.string().url().max(1000),
        uploadthingKey: z.string().max(500),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        mimeType: z.string().max(50),
        fileSize: z.number().int().positive(),
        takenAt: z.string().optional(),
      })
    )
    .min(1)
    .max(500),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "relaxed");
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const page = Math.max(parseInt(searchParams.get("page") || "1") || 1, 1);
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") || "50") || 50, 1),
    MAX_PAGE_LIMIT
  );
  const offset = (page - 1) * limit;

  const userPhotos = await db
    .select()
    .from(photos)
    .where(and(eq(photos.userId, session.user.id), isNull(photos.deletedAt)))
    .orderBy(desc(sql`COALESCE(${photos.takenAt}, ${photos.uploadedAt})`))
    .limit(limit)
    .offset(offset);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(photos)
    .where(and(eq(photos.userId, session.user.id), isNull(photos.deletedAt)));

  return NextResponse.json({
    photos: userPhotos,
    total: Number(countResult.count),
    page,
    totalPages: Math.ceil(Number(countResult.count) / limit),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "strict");
  if (limited) return limited;

  const body = await req.json();
  const parsed = createPhotoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const items = parsed.data.photos;

  const newPhotos = await db
    .insert(photos)
    .values(
      items.map((item) => ({
        userId: session.user!.id!,
        originalFilename: item.originalFilename,
        fileHash: item.fileHash,
        uploadthingUrl: item.uploadthingUrl,
        uploadthingKey: item.uploadthingKey,
        width: item.width || null,
        height: item.height || null,
        mimeType: item.mimeType,
        fileSize: item.fileSize,
        takenAt: item.takenAt ? new Date(item.takenAt) : null,
        status: "processing" as const,
      }))
    )
    .returning();

  // Trigger worker webhook for each photo
  const workerUrl = process.env.WORKER_WEBHOOK_URL;
  const callbackSecret = process.env.WORKER_CALLBACK_SECRET;

  if (workerUrl && callbackSecret) {
    for (const photo of newPhotos) {
      fetch(workerUrl, {
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
      }).catch(console.error);
    }
  }

  return NextResponse.json({ photos: newPhotos });
}
