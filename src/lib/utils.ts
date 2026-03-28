import { type ClassValue } from "zod";

export function formatDate(date: Date | string | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) return formatDate(d);
  if (days > 0) return `${days} ngày trước`;
  if (hours > 0) return `${hours} giờ trước`;
  if (minutes > 0) return `${minutes} phút trước`;
  return "Vừa xong";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function getPhotoDisplayDate(
  takenAt: Date | null,
  uploadedAt: Date
): Date {
  return takenAt || uploadedAt;
}

export function groupPhotosByDate<T extends { takenAt: Date | null; uploadedAt: Date }>(
  photos: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const photo of photos) {
    const date = getPhotoDisplayDate(photo.takenAt, photo.uploadedAt);
    const key = date.toISOString().split("T")[0];
    const existing = groups.get(key) || [];
    existing.push(photo);
    groups.set(key, existing);
  }

  return groups;
}
