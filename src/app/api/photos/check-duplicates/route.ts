import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const items: { hash: string; filename: string }[] = body.items;

  if (!items?.length) {
    return NextResponse.json({ duplicates: [] });
  }

  const hashes = items.map((i) => i.hash);
  const filenames = items.map((i) => i.filename);

  const existing = await db
    .select({ fileHash: photos.fileHash, originalFilename: photos.originalFilename })
    .from(photos)
    .where(
      and(
        eq(photos.userId, session.user.id),
        or(
          inArray(photos.fileHash, hashes),
          inArray(photos.originalFilename, filenames)
        )
      )
    );

  const duplicateHashes = new Set(existing.map((e) => e.fileHash));
  const duplicateFilenames = new Set(existing.map((e) => e.originalFilename));

  const duplicates = items
    .filter(
      (item) =>
        duplicateHashes.has(item.hash) || duplicateFilenames.has(item.filename)
    )
    .map((item) => ({
      hash: item.hash,
      filename: item.filename,
      reason: duplicateHashes.has(item.hash) ? "hash" : "filename",
    }));

  return NextResponse.json({ duplicates });
}
