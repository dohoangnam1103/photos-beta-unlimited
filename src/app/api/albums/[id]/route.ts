import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { albums, albumPhotos, photos } from "@/db/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const updateAlbumSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  coverPhotoId: z.string().max(100).optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "relaxed");
  if (limited) return limited;

  const [album] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, id), eq(albums.userId, session.user.id)))
    .limit(1);

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const albumPhotosList = await db
    .select({
      id: photos.id,
      originalFilename: photos.originalFilename,
      uploadthingUrl: photos.uploadthingUrl,
      telegramFileId: photos.telegramFileId,
      takenAt: photos.takenAt,
      uploadedAt: photos.uploadedAt,
      status: photos.status,
      width: photos.width,
      height: photos.height,
      fileSize: photos.fileSize,
      addedAt: albumPhotos.addedAt,
    })
    .from(albumPhotos)
    .innerJoin(photos, eq(albumPhotos.photoId, photos.id))
    .where(and(eq(albumPhotos.albumId, id), isNull(photos.deletedAt)))
    .orderBy(desc(sql`COALESCE(${photos.takenAt}, ${photos.uploadedAt})`));

  return NextResponse.json({ album, photos: albumPhotosList });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "standard");
  if (limited) return limited;

  const body = await req.json();
  const parsed = updateAlbumSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, description, coverPhotoId } = parsed.data;

  const [album] = await db
    .update(albums)
    .set({
      ...(name && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(coverPhotoId !== undefined && { coverPhotoId }),
      updatedAt: new Date(),
    })
    .where(and(eq(albums.id, id), eq(albums.userId, session.user.id)))
    .returning();

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  return NextResponse.json({ album });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "standard");
  if (limited) return limited;

  await db
    .delete(albums)
    .where(and(eq(albums.id, id), eq(albums.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
