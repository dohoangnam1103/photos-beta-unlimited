"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Lightbox from "yet-another-react-lightbox";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import "yet-another-react-lightbox/styles.css";
import { SLIDESHOW_DELAY_MS } from "@/lib/constants";

import { TrashIcon, InfoIcon, XIcon } from "@/components/ui/Icons";

interface PhotoLightboxProps {
  open: boolean;
  close: () => void;
  slides: { id?: string; src: string; alt?: string; width?: number; height?: number; fileSize?: number; uploadedAt?: Date; takenAt?: Date | null }[];
  index: number;
  onDelete?: (photoId: string) => void;
  showDelete?: boolean;
}

export function PhotoLightbox({ open, close, slides, index, onDelete, showDelete }: PhotoLightboxProps) {
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(index);
  const [showInfo, setShowInfo] = useState(false);

  const formatBytes = (bytes?: number) => {
    if (!bytes) return "Không rõ";
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date?: Date | null) => {
    if (!date) return "Không rõ";
    return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(date));
  };

  useEffect(() => {
    if (open) {
      setActiveIndex(index);
    }
  }, [open, index]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchDeltaY.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientY - touchStartY.current;
    touchDeltaY.current = delta;

    if (containerRef.current && delta > 0) {
      const opacity = Math.max(0, 1 - delta / 300);
      const scale = Math.max(0.85, 1 - delta / 1500);
      containerRef.current.style.transform = `translateY(${delta}px) scale(${scale})`;
      containerRef.current.style.opacity = String(opacity);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaY.current > 120) {
      close();
    }
    if (containerRef.current) {
      containerRef.current.style.transform = "";
      containerRef.current.style.opacity = "";
    }
    touchDeltaY.current = 0;
  }, [close]);

  const handleDelete = () => {
    if (!showDelete || !onDelete) return;
    const currentSlide = slides[activeIndex];
    if (!currentSlide || !currentSlide.id) return;
    
    // User confirmation
    if (confirm("Bạn có chắc chắn muốn xoá ảnh này vĩnh viễn?")) {
      onDelete(currentSlide.id);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "fixed", inset: 0, zIndex: 9999, transition: "transform 200ms ease, opacity 200ms ease" }}
    >
      {showDelete && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          style={{
            position: "absolute",
            top: "var(--space-3)",
            right: "var(--space-12)", // to not overlap with close button
            zIndex: 10000,
            background: "rgba(0,0,0,0.5)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: 40,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          title="Xoá ảnh này"
        >
          <TrashIcon size={20} />
        </button>
      )}
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowInfo(true);
        }}
        style={{
          position: "absolute",
          top: "var(--space-3)",
          right: (showDelete && onDelete) ? "calc(var(--space-12) + 50px)" : "var(--space-12)",
          zIndex: 10000,
          background: "rgba(0,0,0,0.5)",
          color: "white",
          border: "none",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        title="Thông tin ảnh"
      >
        <InfoIcon size={20} />
      </button>

      {showInfo && slides[activeIndex] && (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.5), transparent)",
          color: "white",
          padding: "var(--space-8) var(--space-4) var(--space-4)",
          zIndex: 10001,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
          animation: "slideUp 0.2s ease-out"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", wordBreak: "break-word" }}>
              {slides[activeIndex].alt || "Không có tên"}
            </h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              style={{ background: "transparent", border: "none", color: "white", cursor: "pointer", padding: 4 }}
            >
              <XIcon size={20} />
            </button>
          </div>
          <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.8)", display: "grid", gridTemplateColumns: "100px 1fr", gap: "4px" }}>
            <span>Độ phân giải:</span> <span>{slides[activeIndex].width || "?"} x {slides[activeIndex].height || "?"}</span>
            <span>Dung lượng:</span> <span>{formatBytes(slides[activeIndex].fileSize)}</span>
            <span>Ngày chụp:</span> <span>{formatDate(slides[activeIndex].takenAt)}</span>
            <span>Ngày tải lên:</span> <span>{formatDate(slides[activeIndex].uploadedAt)}</span>
          </div>
        </div>
      )}

      <Lightbox
        open={open}
        close={close}
        slides={slides}
        index={index}
        on={{ view: ({ index: currentIndex }) => setActiveIndex(currentIndex) }}
        plugins={[Slideshow]}
        slideshow={{ autoplay: false, delay: SLIDESHOW_DELAY_MS }}
        animation={{ swipe: 250 }}
        carousel={{ finite: false }}
        controller={{ closeOnBackdropClick: true }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
        }}
      />
    </div>
  );
}
