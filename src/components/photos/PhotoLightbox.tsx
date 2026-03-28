"use client";

import Lightbox from "yet-another-react-lightbox";
import Slideshow from "yet-another-react-lightbox/plugins/slideshow";
import "yet-another-react-lightbox/styles.css";
import { SLIDESHOW_DELAY_MS } from "@/lib/constants";

interface PhotoLightboxProps {
  open: boolean;
  close: () => void;
  slides: { src: string; alt?: string; width?: number; height?: number }[];
  index: number;
}

export function PhotoLightbox({ open, close, slides, index }: PhotoLightboxProps) {
  return (
    <Lightbox
      open={open}
      close={close}
      slides={slides}
      index={index}
      plugins={[Slideshow]}
      slideshow={{ autoplay: false, delay: SLIDESHOW_DELAY_MS }}
      animation={{ swipe: 250 }}
      carousel={{ finite: false }}
      controller={{ closeOnBackdropClick: true }}
      styles={{
        container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
      }}
      on={{
        // Close on swipe down
        click: () => {},
      }}
    />
  );
}
