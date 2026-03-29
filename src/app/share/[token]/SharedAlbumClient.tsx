"use client";

import { useState, useCallback } from "react";
import { PhotoLightbox } from "@/components/photos/PhotoLightbox";
import { formatDate } from "@/lib/utils";
import styles from "@/styles/gallery.module.scss";

interface Photo {
  id: string;
  originalFilename: string;
  uploadthingUrl: string | null;
  telegramFileId: string | null;
  takenAt: Date | null;
  uploadedAt: Date;
  width: number | null;
  height: number | null;
}

interface Album {
  name: string;
  description: string | null;
}

function getImageSrc(photo: Photo): string {
  if (photo.telegramFileId) {
    if (process.env.NEXT_PUBLIC_CDN_URL) {
      return `${process.env.NEXT_PUBLIC_CDN_URL}/image/${photo.telegramFileId}`;
    }
    return `/api/telegram/image/${photo.id}`;
  }
  return photo.uploadthingUrl || "";
}

export function SharedAlbumClient({
  album,
  photos,
}: {
  album: Album;
  photos: Photo[];
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const downloadAll = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    try {
      const { downloadZip } = await import("client-zip");
      
      async function* getFiles() {
        for (let i = 0; i < photos.length; i++) {
          const p = photos[i];
          const url = getImageSrc(p);
          const res = await fetch(url);
          if (res.ok) {
            setDownloadProgress(i + 1);
            yield {
              name: p.originalFilename || `photo_${i}.jpg`,
              lastModified: new Date(p.takenAt || p.uploadedAt),
              input: res
            };
          }
        }
      }

      // Nén zip qua luồng stream (tiết kiệm RAM cho iOS/Android)
      const blob = await downloadZip(getFiles()).blob();

      // Kích hoạt download
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${album.name || "album"}.zip`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (e) {
      alert("Tải xuống thất bại. Vui lòng thử lại.");
    } finally {
      setDownloading(false);
    }
  };

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const slides = photos.map((p) => ({
    src: getImageSrc(p),
    alt: p.originalFilename,
    width: p.width || 1920,
    height: p.height || 1080,
  }));

  return (
    <div className={styles.galleryPage} style={{ minHeight: "100dvh" }}>
      <div className={styles.galleryHeader}>
        <div style={{ flex: 1 }}>
          <h1>{album.name}</h1>
          {album.description && (
            <p style={{ color: "var(--color-text-secondary)", marginTop: "var(--space-1)" }}>
              {album.description}
            </p>
          )}
          <p style={{ color: "var(--color-text-tertiary)", fontSize: "0.8rem", marginTop: "var(--space-1)" }}>
            {photos.length} ảnh • Album được chia sẻ
          </p>
        </div>
        <div>
          <button 
            onClick={downloadAll} 
            disabled={downloading}
            style={{
              padding: "8px 16px",
              background: "var(--color-primary)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
              opacity: downloading ? 0.7 : 1
            }}
          >
            {downloading ? `Đang tải ${downloadProgress}/${photos.length}...` : "⬇️ Tải tất cả"}
          </button>
        </div>
      </div>

      <div className={styles.masonry}>
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={styles.masonryItem}
            onClick={() => openLightbox(index)}
          >
            <img src={getImageSrc(photo)} alt={photo.originalFilename} loading="lazy" />
            <div className={styles.masonryOverlay}>
              <span className={styles.photoDate}>
                {formatDate(photo.takenAt || photo.uploadedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <PhotoLightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
      />
    </div>
  );
}
