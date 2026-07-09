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

  async function handleDownload() {
    if (!panelRef.current) {
      return;
    }

    setIsDownloading(true);

    try {
      await downloadElementAsPng(panelRef.current, fileName);
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section
      className={`relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className}`}
      ref={panelRef}
    >
      <button
        className="absolute right-4 top-4 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-950 disabled:cursor-not-allowed disabled:text-slate-400"
        data-export-ignore="true"
        disabled={isDownloading}
        onClick={handleDownload}
        type="button"
      >
        {isDownloading ? "Готовим..." : "Скачать"}
      </button>
      <div className="pr-28">{children}</div>
    </section>
  );
}

async function downloadElementAsPng(element: HTMLElement, fileName: string) {
  await document.fonts.ready;

  const clone = element.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("[data-export-ignore='true']")
    .forEach((node) => node.remove());
  inlineComputedStyles(element, clone);

  const width = Math.ceil(element.scrollWidth);
  const height = Math.ceil(element.scrollHeight);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        ${new XMLSerializer().serializeToString(clone)}
      </foreignObject>
    </svg>
  `;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    const scale = Math.max(window.devicePixelRatio || 1, 2);
    canvas.width = width * scale;
    canvas.height = height * scale;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.scale(scale, scale);
    context.fillStyle = "#f5f7fb";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0);

    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `${fileName}.png`;
    link.click();
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function inlineComputedStyles(source: Element, target: Element) {
  const computedStyle = window.getComputedStyle(source);
  const cssText = Array.from(computedStyle)
    .map((property) => `${property}:${computedStyle.getPropertyValue(property)};`)
    .join("");

  target.setAttribute("style", `${target.getAttribute("style") ?? ""};${cssText}`);

  Array.from(source.children).forEach((sourceChild, index) => {
    const targetChild = target.children.item(index);
    if (targetChild) {
      inlineComputedStyles(sourceChild, targetChild);
    }
  });
}
