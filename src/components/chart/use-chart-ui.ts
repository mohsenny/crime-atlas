"use client";

import { useEffect, useState } from "react";

export function useChartUi() {
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse)");
    const sync = () => {
      setHasCoarsePointer(mediaQuery.matches);
      setViewportWidth(window.innerWidth);
    };

    sync();
    mediaQuery.addEventListener("change", sync);
    window.addEventListener("resize", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const isMobileViewport = viewportWidth > 0 && viewportWidth < 640;

  return {
    viewportWidth,
    hasCoarsePointer,
    isMobileViewport,
    disableInteractiveTooltip: isMobileViewport || hasCoarsePointer,
  };
}
