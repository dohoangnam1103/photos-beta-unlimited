"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckIcon } from "@/components/ui/Icons";
import styles from "@/styles/albums.module.scss";

interface Photo {
  id: string;
  originalFilename: string;
  uploadthingUrl: string | null;
  telegramFileId: string | null;
}

function getImageSrc(photo: Photo): string {
  if (photo.telegramFileId) return `/api/telegram/image/${photo.id}`;
  return photo.uploadthingUrl || "";
}

export default function AlbumEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [albumPhotoIds, setAlbumPhotoIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [photosRes, albumRes] = await Promise.all([
        fetch("/api/photos?limit=500"),
        fetch(`/api/albums/${id}`),
      ]);

      const photosData = await photosRes.json();
      const albumData = await albumRes.json();

      setAllPhotos(photosData.photos || []);

      const existingIds = new Set<string>(
        (albumData.photos || []).map((p: { id: string }) => p.id)
      );
      setAlbumPhotoIds(existingIds);
    } catch {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const togglePhoto = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const saveSelection = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);

    try {
      await fetch(`/api/albums/${id}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: Array.from(selectedIds) }),
      });
      router.push(`/albums/${id}`);
    } catch {
      console.error("Failed to add photos");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.photoPicker}>
        <p>Đang tải...</p>
      </div>
    );
  }

  return (
    <div className={styles.photoPicker}>
      <Link href={`/albums/${id}`} className={styles.backLink}>
        ← Quay lại album
      </Link>

      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "var(--space-2)" }}>
        Thêm ảnh vào album
      </h1>
      <p style={{ color: "var(--color-text-secondary)", marginBottom: "var(--space-5)", fontSize: "0.9rem" }}>
        Chọn ảnh bạn muốn thêm. Ảnh đã có trong album sẽ được bỏ qua tự động.
      </p>

      <div className={styles.pickerGrid}>
        {allPhotos.map((photo) => {
          const isInAlbum = albumPhotoIds.has(photo.id);
          const isSelected = selectedIds.has(photo.id);

          return (
            <div
              key={photo.id}
              className={`${styles.pickerItem} ${isSelected ? styles.selected : ""}`}
              onClick={() => !isInAlbum && togglePhoto(photo.id)}
              style={isInAlbum ? { opacity: 0.4, cursor: "default" } : {}}
            >
              <img src={getImageSrc(photo)} alt={photo.originalFilename} loading="lazy" />
              {isSelected && (
                <div className={styles.pickerCheck}>
                  <CheckIcon size={14} />
                </div>
              )}
              {isInAlbum && (
                <div className={styles.pickerCheck} style={{ background: "var(--color-success)" }}>
                  <CheckIcon size={14} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <div className={`${styles.pickerActions} glass`}>
          <span style={{ fontSize: "0.9rem" }}>
            Đã chọn <strong>{selectedIds.size}</strong> ảnh
          </span>
          <button
            className={styles.createBtn}
            onClick={saveSelection}
            disabled={saving}
          >
            {saving ? "Đang thêm..." : `Thêm ${selectedIds.size} ảnh`}
          </button>
        </div>
      )}
    </div>
  );
}
