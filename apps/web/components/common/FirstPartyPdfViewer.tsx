"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  FileText,
  Scan,
  Hand,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildApiUrl, getApiOrigin } from "@/lib/api/client";

export function normalizePdfUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;

  // Blob and Data URLs are already local and safe
  if (rawUrl.startsWith("blob:") || rawUrl.startsWith("data:")) {
    return rawUrl;
  }

  // Detect Google Drive URLs (preview, view, uc, open) and transform to first-party proxy
  const driveMatch = rawUrl.match(/(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*?id=))([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    const fileId = driveMatch[1];
    return buildApiUrl(`/media/drive/${fileId}/`);
  }

  // If URL is a relative path starting with /api or /, prepend API origin so PDF.js doesn't fetch from Next.js port
  if (rawUrl.startsWith("/")) {
    const origin = getApiOrigin();
    rawUrl = `${origin}${rawUrl}`;
  }

  // Ensure download endpoints serve inline for previewing
  if (rawUrl.includes("/download/") && !rawUrl.includes("disposition=")) {
    rawUrl += (rawUrl.includes("?") ? "&" : "?") + "disposition=inline";
  }

  return rawUrl;
}

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

interface FirstPartyPdfViewerProps {
  url: string | null | undefined;
  title?: string;
  allowDownload?: boolean;
  onDownload?: () => void;
  className?: string;
  initialScale?: number;
}

export function FirstPartyPdfViewer({
  url,
  title = "Document Preview",
  allowDownload = false,
  onDownload,
  className = "",
  initialScale,
}: FirstPartyPdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(initialScale || 1.1);
  const [displayScale, setDisplayScale] = useState(initialScale || 1.1);
  const [rotation, setRotation] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [isFitWidth, setIsFitWidth] = useState(true);

  // Pan / Drag State
  const [isPanMode, setIsPanMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const effectiveScaleRef = useRef<number>(initialScale || 1.1);
  const pageDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
    hasMoved: boolean;
  }>({
    pointerId: -1,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
    hasMoved: false,
  });

  // 1. Ensure PDF.js is loaded
  const loadPdfJs = useCallback((): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined") return reject("SSR");
      if (window.pdfjsLib) {
        return resolve(window.pdfjsLib);
      }

      const existingScript = document.getElementById("pdfjs-lib-script");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.pdfjsLib));
        existingScript.addEventListener("error", (e) => reject(e));
        return;
      }

      const script = document.createElement("script");
      script.id = "pdfjs-lib-script";
      script.src = "/vendor/pdfjs/pdf.min.js";
      script.async = true;
      script.onload = () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.js";
          resolve(window.pdfjsLib);
        } else {
          reject(new Error("PDF.js library failed to initialize"));
        }
      };
      script.onerror = () => {
        // Fallback to CDN if local script fails
        const fallbackScript = document.createElement("script");
        fallbackScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        fallbackScript.onload = () => {
          if (window.pdfjsLib) {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc =
              "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
            resolve(window.pdfjsLib);
          } else {
            reject(new Error("CDN PDF.js fallback failed to initialize"));
          }
        };
        fallbackScript.onerror = () => reject(new Error("Could not load PDF renderer"));
        document.head.appendChild(fallbackScript);
      };
      document.head.appendChild(script);
    });
  }, []);

  // 2. Load PDF Document from URL / Blob
  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setNumPages(0);
    setRenderedPages(new Set());
    pageDimensionsRef.current = null;

    const resolvedUrl = normalizePdfUrl(url);
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const httpHeaders: Record<string, string> = {};
    if (token && !resolvedUrl.startsWith("blob:") && !resolvedUrl.startsWith("data:")) {
      httpHeaders["Authorization"] = `Bearer ${token}`;
    }

    loadPdfJs()
      .then((pdfjs) => {
        if (!active) return;
        const loadingTask = pdfjs.getDocument({
          url: resolvedUrl,
          httpHeaders,
          withCredentials: true,
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
          cMapPacked: true,
        });

        return loadingTask.promise;
      })
      .then((doc) => {
        if (!active || !doc) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error("PDF load error:", err);
        setError("Failed to render PDF document. The file may be corrupt or inaccessible.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [url, loadPdfJs]);

  const renderTasksRef = useRef<Map<number, any>>(new Map());
  const renderedPagesRef = useRef<Set<number>>(new Set());

  // 3. Render individual page onto its canvas
  const renderPage = useCallback(
    async (pageIndex: number, pageDiv: HTMLDivElement) => {
      if (!pdfDoc) return;
      const pageNumber = pageIndex + 1;

      // Skip if already rendered for the current zoom/rotation
      if (renderedPagesRef.current.has(pageNumber)) {
        return;
      }

      // If a render task is already in-flight for this page, let it finish
      if (renderTasksRef.current.has(pageNumber)) {
        return;
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        let targetScale = scale;

        // Auto Fit-width calculation if enabled
        if (isFitWidth && scrollAreaRef.current) {
          const unscaledViewport = page.getViewport({ scale: 1, rotation });
          const containerWidth = scrollAreaRef.current.clientWidth - 48; // padding
          if (containerWidth > 200) {
            targetScale = containerWidth / unscaledViewport.width;
          }
        }

        effectiveScaleRef.current = targetScale;
        setDisplayScale(targetScale);

        const viewport = page.getViewport({ scale: targetScale, rotation });
        const outputScale = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

        const pageWidth = Math.floor(viewport.width);
        const pageHeight = Math.floor(viewport.height);

        // Update pageDiv dimensions so that the layout & scroll area size perfectly to the page
        pageDiv.style.width = `${pageWidth}px`;
        pageDiv.style.height = `${pageHeight}px`;
        pageDiv.style.minWidth = `${pageWidth}px`;
        pageDiv.style.minHeight = `${pageHeight}px`;

        // Store estimated dimensions for other unrendered pages so scrollbar doesn't jump
        if (!pageDimensionsRef.current) {
          pageDimensionsRef.current = { width: pageWidth, height: pageHeight };
          pageRefs.current.forEach((el, i) => {
            if (el && i !== pageIndex && !renderedPagesRef.current.has(i + 1)) {
              el.style.width = `${pageWidth}px`;
              el.style.height = `${pageHeight}px`;
              el.style.minWidth = `${pageWidth}px`;
              el.style.minHeight = `${pageHeight}px`;
            }
          });
        }

        let canvas = pageDiv.querySelector("canvas");
        if (!canvas) {
          canvas = document.createElement("canvas");
          pageDiv.appendChild(canvas);
        }

        canvas.className = "block";
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${pageWidth}px`;
        canvas.style.height = `${pageHeight}px`;
        canvas.style.maxWidth = "none";
        canvas.style.maxHeight = "none";

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

        const renderContext = {
          canvasContext: ctx,
          transform,
          viewport,
        };

        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNumber, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNumber);
        renderedPagesRef.current.add(pageNumber);
        setRenderedPages((prev) => new Set(prev).add(pageNumber));
      } catch (err: any) {
        renderTasksRef.current.delete(pageNumber);
        if (err?.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    },
    [pdfDoc, scale, rotation, isFitWidth]
  );

  // 4. Lazy progressive rendering using IntersectionObserver
  useEffect(() => {
    if (!pdfDoc || numPages === 0 || !scrollAreaRef.current) return;

    // Reset rendered pages tracking when scale or rotation changes
    renderTasksRef.current.forEach((task) => {
      try {
        task.cancel();
      } catch {
        // ignore
      }
    });
    renderTasksRef.current.clear();
    renderedPagesRef.current.clear();
    setRenderedPages(new Set());
    pageDimensionsRef.current = null;

    // Immediately render current page without waiting for observer
    const activeIdx = Math.max(0, Math.min(currentPage - 1, numPages - 1));
    if (pageRefs.current[activeIdx]) {
      renderPage(activeIdx, pageRefs.current[activeIdx]!);
    } else if (pageRefs.current[0]) {
      renderPage(0, pageRefs.current[0]!);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageDiv = entry.target as HTMLDivElement;
            const pageNumAttr = pageDiv.getAttribute("data-page-number");
            if (pageNumAttr) {
              const pageIdx = parseInt(pageNumAttr, 10) - 1;
              if (pageIdx >= 0) {
                renderPage(pageIdx, pageDiv);
              }
            }
          }
        });
      },
      {
        root: scrollAreaRef.current,
        rootMargin: "600px 0px", // pre-render when within 600px of viewport
        threshold: 0.01,
      }
    );

    pageRefs.current.forEach((pageDiv) => {
      if (pageDiv) observer.observe(pageDiv);
    });

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, numPages, scale, rotation, renderPage]);

  // 5. Auto re-calculate Fit-to-Width on container resize
  useEffect(() => {
    const scrollEl = scrollAreaRef.current;
    if (!scrollEl || !isFitWidth || !pdfDoc) return;

    let resizeTimer: NodeJS.Timeout;
    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        renderTasksRef.current.forEach((task) => {
          try {
            task.cancel();
          } catch {
            // ignore
          }
        });
        renderTasksRef.current.clear();
        renderedPagesRef.current.clear();
        setRenderedPages(new Set());
        pageDimensionsRef.current = null;

        const activeIdx = Math.max(0, Math.min(currentPage - 1, numPages - 1));
        if (pageRefs.current[activeIdx]) {
          renderPage(activeIdx, pageRefs.current[activeIdx]!);
        }
      }, 100);
    });

    ro.observe(scrollEl);
    return () => {
      ro.disconnect();
      clearTimeout(resizeTimer);
    };
  }, [isFitWidth, pdfDoc, currentPage, numPages, renderPage]);

  // 6. Track current page on scroll
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current || pageRefs.current.length === 0) return;
    const scrollTop = scrollAreaRef.current.scrollTop + 100;

    let foundPage = 1;
    for (let i = 0; i < pageRefs.current.length; i++) {
      const el = pageRefs.current[i];
      if (el && el.offsetTop <= scrollTop) {
        foundPage = i + 1;
      }
    }
    setCurrentPage(foundPage);
  }, []);

  const scrollToPage = (pageNum: number) => {
    const targetIdx = Math.max(0, Math.min(pageNum - 1, numPages - 1));
    const targetEl = pageRefs.current[targetIdx];
    if (targetEl && scrollAreaRef.current) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleZoomIn = () => {
    const currentBase = isFitWidth ? effectiveScaleRef.current : scale;
    const nextScale = Math.min(Math.round((currentBase + 0.25) * 100) / 100, 3.5);
    setIsFitWidth(false);
    setScale(nextScale);
  };

  const handleZoomOut = () => {
    const currentBase = isFitWidth ? effectiveScaleRef.current : scale;
    const nextScale = Math.max(Math.round((currentBase - 0.25) * 100) / 100, 0.4);
    setIsFitWidth(false);
    setScale(nextScale);
  };

  const handleFitWidth = () => {
    setIsFitWidth(true);
    setScale((prev) => prev);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // 7. Mouse / Pointer Drag to Pan (move document in any direction: down, right, up, left)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary mouse button
    if (e.pointerType === "touch" && !isPanMode) return; // Let touch scroll natively unless pan mode is toggled
    if (!scrollAreaRef.current) return;

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: scrollAreaRef.current.scrollLeft,
      scrollTop: scrollAreaRef.current.scrollTop,
      hasMoved: false,
    };
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollAreaRef.current) return;
    if (e.pointerId !== dragStartRef.current.pointerId) return;

    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStartRef.current.hasMoved = true;
    }

    // Direct movement: dragging down moves page down, dragging right moves page right
    scrollAreaRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
    scrollAreaRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === dragStartRef.current.pointerId) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // 8. Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!scrollAreaRef.current) return;
    const step = 60;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        scrollAreaRef.current.scrollTop += step;
        break;
      case "ArrowUp":
        e.preventDefault();
        scrollAreaRef.current.scrollTop -= step;
        break;
      case "ArrowRight":
        e.preventDefault();
        scrollAreaRef.current.scrollLeft += step;
        break;
      case "ArrowLeft":
        e.preventDefault();
        scrollAreaRef.current.scrollLeft -= step;
        break;
      case "PageDown":
        e.preventDefault();
        scrollAreaRef.current.scrollTop += scrollAreaRef.current.clientHeight * 0.8;
        break;
      case "PageUp":
        e.preventDefault();
        scrollAreaRef.current.scrollTop -= scrollAreaRef.current.clientHeight * 0.8;
        break;
      case "+":
      case "=":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleZoomIn();
        }
        break;
      case "-":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleZoomOut();
        }
        break;
    }
  };

  // 9. Ctrl + Wheel Zoom
  useEffect(() => {
    const scrollEl = scrollAreaRef.current;
    if (!scrollEl) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          handleZoomIn();
        } else {
          handleZoomOut();
        }
      }
    };

    scrollEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      scrollEl.removeEventListener("wheel", handleWheel);
    };
  }, [handleZoomIn, handleZoomOut]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-hidden ${className}`}
    >
      {/* Top First-Party Toolbar - Completely distraction-free */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950 border-b border-slate-800 shrink-0 z-10 shadow-sm">
        {/* Document Title & Badge */}
        <div className="flex items-center gap-2 min-w-0 max-w-[240px] sm:max-w-md">
          <FileText className="w-4 h-4 text-[#C4A45C] shrink-0" />
          <span className="text-xs font-semibold truncate text-slate-200" title={title}>
            {title}
          </span>
          <span className="hidden sm:inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            PDF
          </span>
        </div>

        {/* Central Controls: Pagination */}
        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
          <button
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono font-medium text-xs">
            {currentPage} <span className="text-slate-500">/</span> {numPages || 1}
          </span>

          <button
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages || loading}
            className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Controls: Pan, Zoom, Rotate, and Protected Download */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Pan / Move Page Tool Toggle */}
          <button
            onClick={() => setIsPanMode(!isPanMode)}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-colors ${
              isPanMode
                ? "bg-[#C4A45C]/25 text-[#C4A45C] border border-[#C4A45C]/40"
                : "hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
            title={
              isPanMode
                ? "Pan mode active: click & drag anywhere to move page"
                : "Enable pan mode (click & drag to move page)"
            }
          >
            <Hand className="w-4 h-4" />
          </button>

          <button
            onClick={handleZoomOut}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out (Ctrl -)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={handleFitWidth}
            disabled={loading}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              isFitWidth
                ? "bg-[#C4A45C]/20 text-[#C4A45C] border border-[#C4A45C]/40"
                : "hover:bg-slate-800 text-slate-300 hover:text-white"
            }`}
            title="Fit to Width"
          >
            <Scan className="w-3.5 h-3.5 inline mr-1" /> Fit
          </button>

          <button
            onClick={handleZoomIn}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom In (Ctrl +)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Current Zoom Percentage */}
          <span
            className="text-[11px] font-mono font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 hidden md:inline-block"
            title="Current zoom level"
          >
            {Math.round(displayScale * 100)}%
          </span>

          <button
            onClick={handleRotate}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Download button - strictly governed by allowDownload permission */}
          {allowDownload && (
            <button
              onClick={onDownload}
              className="ml-1 px-2.5 py-1 bg-[#C4A45C] hover:bg-[#b09048] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-xs"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Scroll Area with Direct Mouse Drag Pan & Full 2D Overflow */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label="PDF Document Pages"
        className={`flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-8 bg-slate-900/95 relative outline-none select-none scrollbar-thin ${
          isDragging
            ? "cursor-grabbing"
            : isPanMode
              ? "cursor-grab"
              : "cursor-grab"
        }`}
        style={{
          overscrollBehavior: "contain",
          touchAction: isPanMode ? "none" : "pan-x pan-y",
        }}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center my-auto py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#C4A45C] mb-3" />
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Rendering PDF Document...
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Preparing clean, first-party reader layout
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center my-auto py-16 text-slate-400 max-w-md text-center p-6 bg-slate-950/60 rounded-2xl border border-red-500/20 mx-auto">
            <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
            <h4 className="text-sm font-bold text-red-200">Unable to Display Document</h4>
            <p className="text-xs text-slate-400 mt-1.5">{error}</p>
            {allowDownload && onDownload && (
              <Button
                size="sm"
                onClick={onDownload}
                className="mt-4 bg-[#C4A45C] hover:bg-[#b09048] text-white text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download Document Instead
              </Button>
            )}
          </div>
        ) : (
          /* Inner wrapper: w-max ensures full width when zoomed in so right side is never cut off;
             min-w-full + mx-auto centers the document cleanly when scale is small */
          <div className="min-w-full w-max flex flex-col items-center gap-6 pb-24 mx-auto">
            {Array.from({ length: numPages }).map((_, idx) => (
              <div
                key={idx}
                ref={(el) => {
                  pageRefs.current[idx] = el;
                }}
                data-page-number={idx + 1}
                className="relative bg-white dark:bg-slate-950 shadow-2xl rounded-sm flex items-center justify-center min-h-[300px] border border-slate-700/60 shrink-0"
                style={{
                  maxWidth: "none",
                }}
              >
                <canvas className="block" style={{ maxWidth: "none" }} />
                {!renderedPages.has(idx + 1) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-800/40 text-slate-400 text-xs pointer-events-none">
                    <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#C4A45C]" />
                    Page {idx + 1}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticky Page Footer on Mobile */}
      {numPages > 1 && (
        <div className="sm:hidden px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-center text-[11px] text-slate-400 font-medium shrink-0">
          Viewing Page {currentPage} of {numPages}
        </div>
      )}
    </div>
  );
}
