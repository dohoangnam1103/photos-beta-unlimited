import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { sharedLinks, albums } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimit(session.user.id, "strict");
  if (limited) return limited;

  // Verify ownership
  const [album] = await db
    .select()
    .from(albums)
    .where(and(eq(albums.id, id), eq(albums.userId, session.user.id)))
    .limit(1);

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  const token = uuidv4();

  const [link] = await db
    .insert(sharedLinks)
    .values({
      albumId: id,
      token,
      isActive: true,
    })
    .returning();

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/share/${token}`;

  return NextResponse.json({ link, shareUrl });
}

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

  const links = await db
    .select()
    .from(sharedLinks)
    .where(and(eq(sharedLinks.albumId, id), eq(sharedLinks.isActive, true)));

  return NextResponse.json({
    links: links.map((l) => ({
      ...l,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/share/${l.token}`,
    })),
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

  const limited = await rateLimit(session.user.id, "standard");
  if (limited) return limited;

  const body = await req.json();
  const { linkId } = body;

  if (!linkId || typeof linkId !== "string") {
    return NextResponse.json({ error: "linkId required" }, { status: 400 });
  }

  // Verify album ownership before deactivating link
  const [album] = await db
    .select({ id: albums.id })
    .from(albums)
    .where(and(eq(albums.id, id), eq(albums.userId, session.user.id)))
    .limit(1);

  if (!album) {
    return NextResponse.json({ error: "Album not found" }, { status: 404 });
  }

  await db
    .update(sharedLinks)
    .set({ isActive: false })
    .where(and(eq(sharedLinks.id, linkId), eq(sharedLinks.albumId, id)));

  return NextResponse.json({ success: true });
}
