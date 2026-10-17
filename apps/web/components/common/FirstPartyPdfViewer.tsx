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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    return `${apiBase}/media/drive/${fileId}/`;
  }

  // If URL is a relative path starting with /api or /, prepend API origin so PDF.js doesn't fetch from Next.js port
  if (rawUrl.startsWith("/")) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    const origin = apiBase.replace(/\/api\/?$/, "");
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
  const [rotation, setRotation] = useState(0);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const [isFitWidth, setIsFitWidth] = useState(true);

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

        const viewport = page.getViewport({ scale: targetScale, rotation });
        const outputScale = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

        let canvas = pageDiv.querySelector("canvas");
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.className = "block max-w-full";
          pageDiv.appendChild(canvas);
        }

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

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

    // Immediately render Page 1 without waiting for observer
    if (pageRefs.current[0]) {
      renderPage(0, pageRefs.current[0]);
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
        rootMargin: "500px 0px", // pre-render when within 500px of viewport
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

  // 5. Track current page on scroll
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
    setIsFitWidth(false);
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setIsFitWidth(false);
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleFitWidth = () => {
    setIsFitWidth(true);
    // Triggers recalculation
    setScale((prev) => prev);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-hidden ${className}`}
    >
      {/* Top First-Party Toolbar - Completely distraction-free, NO Google Drive branding */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-slate-950 border-b border-slate-800 shrink-0 z-10 shadow-sm">
        {/* Document Title & Badge */}
        <div className="flex items-center gap-2 min-w-0 max-w-[280px] sm:max-w-md">
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

        {/* Right Controls: Zoom, Rotate, and Protected Download */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={handleZoomOut}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
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
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

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

      {/* Main Canvas Scroll Area */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 bg-slate-900/90 flex flex-col items-center gap-6"
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
          <div className="flex flex-col items-center justify-center my-auto py-16 text-slate-400 max-w-md text-center p-6 bg-slate-950/60 rounded-2xl border border-red-500/20">
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
          Array.from({ length: numPages }).map((_, idx) => (
            <div
              key={idx}
              ref={(el) => {
                pageRefs.current[idx] = el;
              }}
              data-page-number={idx + 1}
              className="relative bg-white dark:bg-slate-950 shadow-2xl rounded-sm transition-all duration-200 overflow-hidden flex items-center justify-center min-h-[300px] border border-slate-700/60"
            >
              <canvas className="block max-w-full" />
              {!renderedPages.has(idx + 1) && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/40 text-slate-400 text-xs pointer-events-none">
                  <Loader2 className="w-5 h-5 animate-spin mr-2 text-[#C4A45C]" />
                  Page {idx + 1}...
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Bottom Sticky Page Footer on Mobile */}
      {numPages > 1 && (
        <div className="sm:hidden px-3 py-1.5 bg-slate-950 border-t border-slate-800 text-center text-[11px] text-slate-400 font-medium">
          Viewing Page {currentPage} of {numPages}
        </div>
      )}
    </div>
  );
}
