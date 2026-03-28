import { db } from "@/db";
import { sharedLinks, albums, albumPhotos, photos } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { SharedAlbumClient } from "./SharedAlbumClient";

export default async function SharedAlbumPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [link] = await db
    .select()
    .from(sharedLinks)
    .where(and(eq(sharedLinks.token, token), eq(sharedLinks.isActive, true)))
    .limit(1);

  if (!link) {
    notFound();
  }

  // Check expiry
  if (link.expiresAt && new Date() > link.expiresAt) {
    notFound();
  }

  const [album] = await db
    .select()
    .from(albums)
    .where(eq(albums.id, link.albumId))
    .limit(1);

  if (!album) {
    notFound();
  }

  const albumPhotosList = await db
    .select({
      id: photos.id,
      originalFilename: photos.originalFilename,
      uploadthingUrl: photos.uploadthingUrl,
      telegramFileId: photos.telegramFileId,
      takenAt: photos.takenAt,
      uploadedAt: photos.uploadedAt,
      width: photos.width,
      height: photos.height,
    })
    .from(albumPhotos)
    .innerJoin(photos, eq(albumPhotos.photoId, photos.id))
    .where(eq(albumPhotos.albumId, link.albumId))
    .orderBy(desc(sql`COALESCE(${photos.takenAt}, ${photos.uploadedAt})`));

  return <SharedAlbumClient album={album} photos={albumPhotosList} />;
}
