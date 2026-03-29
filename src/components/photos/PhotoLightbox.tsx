"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import Lightbox from "yet-another-react-lightbox";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import "yet-another-react-lightbox/styles.css";
import { SLIDESHOW_DELAY_MS } from "@/lib/constants";

import { TrashIcon } from "@/components/ui/Icons";

interface PhotoLightboxProps {
  open: boolean;
  close: () => void;
  slides: { id?: string; src: string; alt?: string; width?: number; height?: number }[];
  index: number;
  onDelete?: (photoId: string) => void;
  showDelete?: boolean;
}

export function PhotoLightbox({ open, close, slides, index, onDelete, showDelete }: PhotoLightboxProps) {
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(index);

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
