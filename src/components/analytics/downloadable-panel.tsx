"use client";

import { type ReactNode, useRef, useState } from "react";

type DownloadablePanelProps = {
  children: ReactNode;
  className?: string;
  fileName: string;
};

export function DownloadablePanel({
  children,
  className = "",
  fileName,
}: DownloadablePanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleDownload() {
    if (!panelRef.current) {
      return;
    }

    setIsDownloading(true);
    setErrorMessage(null);

    try {
      await downloadElementAsPng(panelRef.current, fileName);
    } catch (error) {
      console.error("Analytics image export failed", error);
      setErrorMessage(
        "Не удалось скачать изображение. Попробуйте обновить страницу или открыть блок в другом браузере.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section
      className={`relative rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`}
      ref={panelRef}
    >
      <button
        className="absolute right-5 top-5 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
        data-export-ignore="true"
        disabled={isDownloading}
        onClick={handleDownload}
        type="button"
      >
        {isDownloading ? "Готовим..." : "Скачать"}
      </button>
      <div className="pr-28">{children}</div>
      {errorMessage ? (
        <p
          className="mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700"
          data-export-ignore="true"
        >
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}

async function downloadElementAsPng(element: HTMLElement, fileName: string) {
  await document.fonts.ready;

  const width = Math.ceil(element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const origin = element.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  const scale = Math.max(window.devicePixelRatio || 1, 2);
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is unavailable");
  }

  context.scale(scale, scale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  renderElementToCanvas(element, context, origin);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("Canvas export failed"));
      }
    }, "image/png");
  });
  const pngUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = pngUrl;
  link.download = `${fileName}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(pngUrl);
}

function renderElementToCanvas(
  element: Element,
  context: CanvasRenderingContext2D,
  origin: DOMRect,
) {
  if (element instanceof HTMLElement && element.dataset.exportIgnore === "true") {
    return;
  }

  const style = window.getComputedStyle(element);

  if (style.display === "none" || style.visibility === "hidden") {
    return;
  }

  const rect = element.getBoundingClientRect();
  const x = rect.left - origin.left;
  const y = rect.top - origin.top;

  drawBox(context, style, x, y, rect.width, rect.height);

  element.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      drawTextNode(node, context, origin);
    } else if (node instanceof Element) {
      renderElementToCanvas(node, context, origin);
    }
  });
}

function drawBox(
  context: CanvasRenderingContext2D,
  style: CSSStyleDeclaration,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (width <= 0 || height <= 0) {
    return;
  }

  const radius = parseFloat(style.borderRadius) || 0;
  const background = style.backgroundColor;
  const borderColor = style.borderColor;
  const borderWidth = parseFloat(style.borderWidth) || 0;

  if (background && background !== "rgba(0, 0, 0, 0)") {
    context.fillStyle = background;
    roundedRect(context, x, y, width, height, radius);
    context.fill();
  }

  if (
    borderWidth > 0 &&
    borderColor &&
    borderColor !== "rgba(0, 0, 0, 0)"
  ) {
    context.strokeStyle = borderColor;
    context.lineWidth = borderWidth;
    roundedRect(
      context,
      x + borderWidth / 2,
      y + borderWidth / 2,
      width - borderWidth,
      height - borderWidth,
      Math.max(radius - borderWidth / 2, 0),
    );
    context.stroke();
  }
}

function drawTextNode(
  node: Node,
  context: CanvasRenderingContext2D,
  origin: DOMRect,
) {
  const text = node.textContent?.replace(/\s+/g, " ").trim();
  const parent = node.parentElement;

  if (!text || !parent) {
    return;
  }

  const style = window.getComputedStyle(parent);
  const range = document.createRange();
  range.selectNodeContents(node);
  const rect = range.getBoundingClientRect();
  range.detach();

  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  context.fillStyle = style.color || "#0f172a";
  context.font = [
    style.fontStyle,
    style.fontVariant,
    style.fontWeight,
    style.fontSize,
    style.fontFamily,
  ]
    .filter(Boolean)
    .join(" ");
  context.textBaseline = "alphabetic";
  context.fillText(
    text,
    rect.left - origin.left,
    rect.top - origin.top + parseFloat(style.fontSize) * 0.9,
    rect.width,
  );
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - safeRadius,
    y + height,
  );
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}
