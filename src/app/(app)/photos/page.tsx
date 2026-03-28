"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { GridIcon, TimelineIcon, UploadIcon } from "@/components/ui/Icons";
import { PhotoLightbox } from "@/components/photos/PhotoLightbox";
import { formatDate } from "@/lib/utils";
import styles from "@/styles/gallery.module.scss";

interface Photo {
  id: string;
  originalFilename: string;
  uploadthingUrl: string | null;
  telegramFileId: string | null;
  takenAt: string | null;
  uploadedAt: string;
  status: string;
  width?: number | null;
  height?: number | null;
}

type ViewMode = "masonry" | "timeline";

function getImageSrc(photo: Photo): string {
  if (photo.telegramFileId) {
    return `/api/telegram/image/${photo.id}`;
  }
  return photo.uploadthingUrl || "";
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("viewMode") as ViewMode | null;
    if (stored) setViewMode(stored);
  }, []);

  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("viewMode", mode);
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const res = await fetch("/api/photos?limit=200");
      const data = await res.json();
      setPhotos(data.photos || []);
    } catch {
      console.error("Failed to fetch photos");
    } finally {
      setLoading(false);
    }
  };

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, []);

  const lightboxSlides = photos.map((p) => ({
    src: getImageSrc(p),
    alt: p.originalFilename,
    width: p.width || 1920,
    height: p.height || 1080,
  }));

  if (loading) {
    return (
      <div className={styles.galleryPage}>
        <div className={styles.galleryHeader}>
          <h1>Ảnh của tôi</h1>
        </div>
        <div className={styles.masonry}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={styles.skeletonMasonry}
              style={{ height: `${150 + Math.random() * 150}px` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={styles.galleryPage}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📷</div>
          <h2>Chưa có ảnh nào</h2>
          <p>Bắt đầu tải ảnh lên để xem bộ sưu tập của bạn</p>
          <Link href="/upload" className={styles.emptyBtn}>
            <UploadIcon size={18} />
            Tải ảnh lên
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.galleryPage}>
      <div className={styles.galleryHeader}>
        <h1>Ảnh của tôi</h1>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewMode === "masonry" ? styles.active : ""}`}
            onClick={() => changeViewMode("masonry")}
          >
            <GridIcon size={16} />
            Lưới
          </button>
          <button
            className={`${styles.viewBtn} ${viewMode === "timeline" ? styles.active : ""}`}
            onClick={() => changeViewMode("timeline")}
          >
            <TimelineIcon size={16} />
            Dòng thời gian
          </button>
        </div>
      </div>

      {viewMode === "masonry" ? (
        <div className={styles.masonry}>
          {photos.map((photo, index) => (
            <div
              key={photo.id}
              className={styles.masonryItem}
              onClick={() => openLightbox(index)}
            >
              <img
                src={getImageSrc(photo)}
                alt={photo.originalFilename}
                loading="lazy"
              />
              {photo.status === "processing" && (
                <div className={styles.processingBadge} />
              )}
              <div className={styles.masonryOverlay}>
                <span className={styles.photoDate}>
                  {formatDate(photo.takenAt || photo.uploadedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.timeline}>
          {(() => {
            // Group photo indices by date
            const groups = new Map<string, number[]>();
            for (let i = 0; i < photos.length; i++) {
              const p = photos[i];
              const dateStr = p.takenAt || p.uploadedAt;
              const key = new Date(dateStr).toISOString().split("T")[0];
              const arr = groups.get(key) || [];
              arr.push(i);
              groups.set(key, arr);
            }

            return Array.from(groups.entries()).map(([dateKey, indices]) => (
              <div key={dateKey} className={styles.timelineGroup}>
                <div className={`${styles.timelineDate} glass`}>
                  {formatDate(dateKey)}
                </div>
                <div className={styles.timelineGrid}>
                  {indices.map((idx) => {
                    const photo = photos[idx];
                    return (
                      <div
                        key={photo.id}
                        className={styles.timelineItem}
                        onClick={() => openLightbox(idx)}
                      >
                        <img
                          src={getImageSrc(photo)}
                          alt={photo.originalFilename}
                          loading="lazy"
                        />
                        {photo.status === "processing" && (
                          <div className={styles.processingBadge} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      <PhotoLightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={lightboxSlides}
        index={lightboxIndex}
      />
    </div>
  );
}
