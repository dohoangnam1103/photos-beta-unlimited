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
      {showInfo && slides[activeIndex] && (
        <div style={{
          position: "fixed",
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: "var(--space-2)", borderBottom: "1px solid rgba(255,255,255,0.1)", marginBottom: "var(--space-2)" }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", wordBreak: "break-word", paddingRight: "var(--space-4)" }}>
              {slides[activeIndex].alt || "Không có tên"}
            </h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setShowInfo(false); }}
              style={{ background: "rgba(255,255,255,0.2)", borderRadius: "50%", border: "none", color: "white", cursor: "pointer", padding: 6, display: "flex", alignItems: "center" }}
            >
              <XIcon size={20} />
            </button>
          </div>
          <div style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.9)", display: "grid", gridTemplateColumns: "110px 1fr", gap: "8px" }}>
            <span style={{color: "rgba(255,255,255,0.6)"}}>Độ phân giải:</span> <span>{slides[activeIndex].width || "?"} x {slides[activeIndex].height || "?"}</span>
            <span style={{color: "rgba(255,255,255,0.6)"}}>Dung lượng:</span> <span>{formatBytes(slides[activeIndex].fileSize)}</span>
            <span style={{color: "rgba(255,255,255,0.6)"}}>Ngày chụp:</span> <span>{formatDate(slides[activeIndex].takenAt)}</span>
            <span style={{color: "rgba(255,255,255,0.6)"}}>Ngày tải lên:</span> <span>{formatDate(slides[activeIndex].uploadedAt)}</span>
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
        toolbar={{
          buttons: [
            <button
              key="info"
              type="button"
              className="yarl__button"
              onClick={(e) => {
                e.preventDefault();
                setShowInfo(true);
              }}
              title="Thông tin ảnh"
              style={{ filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.5))" }}
            >
              <InfoIcon size={24} />
            </button>,
            ...(showDelete && onDelete ? [
              <button
                key="delete"
                type="button"
                className="yarl__button"
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                title="Xoá ảnh này"
                style={{ filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.5))" }}
              >
                <TrashIcon size={24} />
              </button>
            ] : []),
            "close"
          ]
        }}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
        }}
      />
    </div>
  );
}
