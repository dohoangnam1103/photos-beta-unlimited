"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { GridIcon, TimelineIcon, UploadIcon, TrashIcon, InfoIcon, XIcon } from "@/components/ui/Icons";
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
  fileSize?: number;
}

type ViewMode = "masonry" | "timeline";

function getImageSrc(photo: Photo): string {
  if (photo.telegramFileId) {
    if (process.env.NEXT_PUBLIC_CDN_URL) {
      return `${process.env.NEXT_PUBLIC_CDN_URL}/image/${photo.telegramFileId}`;
    }
    return `/api/telegram/image/${photo.id}`;
  }
  return photo.uploadthingUrl || "";
}

function formatBytes(bytes?: number) {
  if (!bytes) return "Không rõ";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("masonry");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [infoPhoto, setInfoPhoto] = useState<Photo | null>(null);
  const retriedRef = useRef(false);

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

      if (!retriedRef.current) {
        retriedRef.current = true;
        fetch("/api/photos/retry-failed", { method: "POST" }).catch(() => {});
      }
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

  const deletePhoto = async (photoId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xoá ảnh này?")) return;
    try {
      const res = await fetch(`/api/photos/${photoId}`, { method: 'DELETE' });
      if (res.ok) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      } else {
        alert("Có lỗi xảy ra khi xoá ảnh.");
      }
    } catch {
      alert("Lỗi kết nối khi xoá ảnh.");
    }
  };

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

  const renderPhotoCard = (photo: Photo, index: number) => (
    <div
      key={photo.id}
      className={styles.masonryItem}
    >
      <img
        src={getImageSrc(photo)}
        alt={photo.originalFilename}
        loading="lazy"
        onClick={() => openLightbox(index)}
      />
      {photo.status === "processing" && (
        <div className={styles.processingBadge} />
      )}
      <div className={styles.masonryOverlay}>
        <span className={styles.photoDate}>
          {formatDate(photo.takenAt || photo.uploadedAt)}
        </span>
      </div>
      <div className={styles.photoActions}>
        <button
          className={styles.photoActionBtn}
          onClick={(e) => { e.stopPropagation(); setInfoPhoto(photo); }}
          title="Thông tin"
        >
          <InfoIcon size={16} />
        </button>
        <button
          className={styles.photoActionBtn}
          onClick={(e) => { e.stopPropagation(); deletePhoto(photo.id); }}
          title="Xoá"
        >
          <TrashIcon size={16} />
        </button>
      </div>
    </div>
  );

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
          {photos.map((photo, index) => renderPhotoCard(photo, index))}
        </div>
      ) : (
        <div className={styles.timeline}>
          {(() => {
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
                  {indices.map((idx) => renderPhotoCard(photos[idx], idx))}
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

      {/* Info Modal */}
      {infoPhoto && (
        <div
          className={styles.infoOverlay}
          onClick={() => setInfoPhoto(null)}
        >
          <div className={styles.infoModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.infoHeader}>
              <h3>Thông tin ảnh</h3>
              <button onClick={() => setInfoPhoto(null)} className={styles.infoClose}>
                <XIcon size={18} />
              </button>
            </div>
            <div className={styles.infoBody}>
              <div className={styles.infoRow}><span>Tên file:</span><span>{infoPhoto.originalFilename}</span></div>
              <div className={styles.infoRow}><span>Độ phân giải:</span><span>{infoPhoto.width || "?"} × {infoPhoto.height || "?"}</span></div>
              <div className={styles.infoRow}><span>Dung lượng:</span><span>{formatBytes(infoPhoto.fileSize)}</span></div>
              <div className={styles.infoRow}><span>Ngày chụp:</span><span>{infoPhoto.takenAt ? formatDate(infoPhoto.takenAt) : "Không rõ"}</span></div>
              <div className={styles.infoRow}><span>Ngày tải lên:</span><span>{formatDate(infoPhoto.uploadedAt)}</span></div>
              <div className={styles.infoRow}><span>Trạng thái:</span><span>{infoPhoto.status === "ready" ? "✅ Sẵn sàng" : infoPhoto.status === "processing" ? "⏳ Đang xử lý" : "⚠️ " + infoPhoto.status}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
