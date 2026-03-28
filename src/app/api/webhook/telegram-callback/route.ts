import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { photos } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (secret !== process.env.WORKER_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { photoId, telegramFileId, error } = body;

  if (!photoId) {
    return NextResponse.json(
      { error: "photoId required" },
      { status: 400 }
    );
  }

  if (error) {
    await db
      .update(photos)
      .set({ status: "failed" })
      .where(eq(photos.id, photoId));

    return NextResponse.json({ status: "failed" });
  }

  await db
    .update(photos)
    .set({
      telegramFileId,
      status: "ready",
    })
    .where(eq(photos.id, photoId));

  return NextResponse.json({ status: "ok" });
}
