import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { albums, albumPhotos, photos } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const createAlbumSchema = z.object({
  name: z.string().trim().min(1, "Tên album không được để trống").max(200),
  description: z.string().trim().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "relaxed");
  if (limited) return limited;

  const userAlbums = await db
    .select({
      id: albums.id,
      name: albums.name,
      description: albums.description,
      coverPhotoId: albums.coverPhotoId,
      createdAt: albums.createdAt,
      updatedAt: albums.updatedAt,
      photoCount: sql<number>`(SELECT count(*) FROM album_photos WHERE album_photos.album_id = ${albums.id})`,
    })
    .from(albums)
    .where(eq(albums.userId, session.user.id))
    .orderBy(desc(albums.updatedAt));

  // Get cover photos
  const albumsWithCovers = await Promise.all(
    userAlbums.map(async (album) => {
      let coverUrl = null;

      if (album.coverPhotoId) {
        const [cover] = await db
          .select({ uploadthingUrl: photos.uploadthingUrl, telegramFileId: photos.telegramFileId, id: photos.id })
          .from(photos)
          .where(eq(photos.id, album.coverPhotoId))
          .limit(1);

        if (cover) {
          coverUrl = cover.telegramFileId
            ? `/api/telegram/image/${cover.id}`
            : cover.uploadthingUrl;
        }
      }

      if (!coverUrl) {
        // Use first photo in album as cover
        const [firstPhoto] = await db
          .select({ uploadthingUrl: photos.uploadthingUrl, telegramFileId: photos.telegramFileId, id: photos.id })
          .from(albumPhotos)
          .innerJoin(photos, eq(albumPhotos.photoId, photos.id))
          .where(eq(albumPhotos.albumId, album.id))
          .limit(1);

        if (firstPhoto) {
          coverUrl = firstPhoto.telegramFileId
            ? `/api/telegram/image/${firstPhoto.id}`
            : firstPhoto.uploadthingUrl;
        }
      }

      return {
        ...album,
        photoCount: Number(album.photoCount),
        coverUrl,
      };
    })
  );

  return NextResponse.json({ albums: albumsWithCovers });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "strict");
  if (limited) return limited;

  const body = await req.json();
  const parsed = createAlbumSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message || "Invalid data" },
      { status: 400 }
    );
  }

  const { name, description } = parsed.data;

  const [album] = await db
    .insert(albums)
    .values({
      userId: session.user.id,
      name,
      description: description || null,
    })
    .returning();

  return NextResponse.json({ album });
}
