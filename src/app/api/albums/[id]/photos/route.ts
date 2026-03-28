import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { albumPhotos, albums } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const [album] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, id), eq(albums.userId, session.user.id)))
    .limit(1);

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const body = await req.json();
  const photoIds: string[] = body.photoIds;

  if (!photoIds?.length) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  // Get existing photo IDs in album
  const existing = await db
    .select({ photoId: albumPhotos.photoId })
    .from(albumPhotos)
    .where(eq(albumPhotos.albumId, id));

  const existingSet = new Set(existing.map((e) => e.photoId));
  const newPhotoIds = photoIds.filter((pid) => !existingSet.has(pid));

  if (newPhotoIds.length > 0) {
    await db.insert(albumPhotos).values(
      newPhotoIds.map((photoId) => ({
        albumId: id,
        photoId,
      }))
    );

    // Update album timestamp
    await db
      .update(albums)
      .set({ updatedAt: new Date() })
      .where(eq(albums.id, id));
  }

  return NextResponse.json({
    added: newPhotoIds.length,
    skipped: photoIds.length - newPhotoIds.length,
  });
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

  const body = await req.json();
  const photoIds: string[] = body.photoIds;

  if (!photoIds?.length) {
    return NextResponse.json({ error: "No photos provided" }, { status: 400 });
  }

  await db
    .delete(albumPhotos)
    .where(
      and(eq(albumPhotos.albumId, id), inArray(albumPhotos.photoId, photoIds))
    );

  return NextResponse.json({ removed: photoIds.length });
}
