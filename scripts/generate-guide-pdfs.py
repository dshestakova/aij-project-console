#!/usr/bin/env python3
"""Generate polished PDF versions of the director and CSM guides."""

from __future__ import annotations

import html
import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
)

ROOT = Path(__file__).resolve().parents[1]
GUIDES_DIR = ROOT / "docs" / "guides"
OUTPUT_DIR = GUIDES_DIR / "pdf"

NAVY = colors.HexColor("#172033")
BLUE = colors.HexColor("#3157D5")
BLUE_LIGHT = colors.HexColor("#EEF3FF")
SLATE = colors.HexColor("#566176")
MUTED = colors.HexColor("#7A8497")
LINE = colors.HexColor("#DDE3EC")
PAPER = colors.HexColor("#F6F8FC")
WHITE = colors.white
AMBER = colors.HexColor("#9A5B00")
AMBER_LIGHT = colors.HexColor("#FFF6DE")


def register_fonts() -> None:
    font_dir = Path("/System/Library/Fonts/Supplemental")
    regular = font_dir / "Arial.ttf"
    bold = font_dir / "Arial Bold.ttf"

    if not regular.exists() or not bold.exists():
        raise RuntimeError("Arial fonts required for Cyrillic PDF output were not found.")

    pdfmetrics.registerFont(TTFont("GuideSans", str(regular)))
    pdfmetrics.registerFont(TTFont("GuideSans-Bold", str(bold)))
    pdfmetrics.registerFontFamily(
        "GuideSans",
        normal="GuideSans",
        bold="GuideSans-Bold",
    )


def build_styles():
    styles = getSampleStyleSheet()
    return {
        "cover_kicker": ParagraphStyle(
            "CoverKicker",
            parent=styles["Normal"],
            fontName="GuideSans-Bold",
            fontSize=10,
            leading=13,
            textColor=BLUE,
            spaceAfter=8,
            alignment=TA_CENTER,
        ),
        "cover_title": ParagraphStyle(
            "CoverTitle",
            parent=styles["Title"],
            fontName="GuideSans-Bold",
            fontSize=29,
            leading=35,
            textColor=NAVY,
            alignment=TA_CENTER,
            spaceAfter=14,
        ),
        "cover_subtitle": ParagraphStyle(
            "CoverSubtitle",
            parent=styles["Normal"],
            fontName="GuideSans",
            fontSize=12,
            leading=18,
            textColor=SLATE,
            alignment=TA_CENTER,
        ),
        "h1": ParagraphStyle(
            "H1",
            parent=styles["Heading1"],
            fontName="GuideSans-Bold",
            fontSize=20,
            leading=25,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=12,
        ),
        "h2": ParagraphStyle(
            "H2",
            parent=styles["Heading2"],
            fontName="GuideSans-Bold",
            fontSize=15,
            leading=20,
            textColor=NAVY,
            spaceBefore=14,
            spaceAfter=7,
            keepWithNext=True,
        ),
        "h3": ParagraphStyle(
            "H3",
            parent=styles["Heading3"],
            fontName="GuideSans-Bold",
            fontSize=11.5,
            leading=15,
            textColor=BLUE,
            spaceBefore=10,
            spaceAfter=5,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body",
            parent=styles["BodyText"],
            fontName="GuideSans",
            fontSize=9.4,
            leading=14.2,
            textColor=NAVY,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            parent=styles["BodyText"],
            fontName="GuideSans",
            fontSize=9.2,
            leading=13.8,
            leftIndent=13,
            firstLineIndent=-8,
            textColor=NAVY,
            spaceAfter=3,
        ),
        "callout": ParagraphStyle(
            "Callout",
            parent=styles["BodyText"],
            fontName="GuideSans",
            fontSize=9.2,
            leading=14,
            leftIndent=10,
            rightIndent=10,
            borderColor=colors.HexColor("#E9C66A"),
            borderWidth=0.8,
            borderPadding=9,
            backColor=AMBER_LIGHT,
            textColor=colors.HexColor("#5E430E"),
            spaceBefore=5,
            spaceAfter=8,
        ),
    }


def normalize_pdf_text(value: str) -> str:
    return (
        value.replace("–", "-")
        .replace("—", "-")
        .replace("‑", "-")
        .replace("→", "->")
        .replace("…", "...")
    )


def inline_markup(value: str) -> str:
    value = normalize_pdf_text(value.strip())
    escaped = html.escape(value)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", escaped)
    escaped = re.sub(r"`(.+?)`", r"<font name='Courier'>\1</font>", escaped)
    return escaped


class ScreenshotPlaceholder(Flowable):
    def __init__(self, label: str, width: float):
        super().__init__()
        self.label = normalize_pdf_text(label)
        self.width = width
        self.height = 32 * mm

    def draw(self):
        canvas = self.canv
        canvas.saveState()
        canvas.setFillColor(PAPER)
        canvas.setStrokeColor(colors.HexColor("#AAB4C5"))
        canvas.setDash(3, 3)
        canvas.roundRect(0, 0, self.width, self.height, 5, fill=1, stroke=1)
        canvas.setDash()
        canvas.setFillColor(MUTED)
        canvas.setFont("GuideSans-Bold", 8.5)
        canvas.drawCentredString(self.width / 2, self.height / 2 + 3, "МЕСТО ДЛЯ СКРИНШОТА")
        canvas.setFont("GuideSans", 7.8)
        text = self.label[:100]
        canvas.drawCentredString(self.width / 2, self.height / 2 - 10, text)
        canvas.restoreState()


def cover_story(title: str, audience: str, styles):
    return [
        Spacer(1, 37 * mm),
        Paragraph("AIJ PROJECT CONSOLE", styles["cover_kicker"]),
        Paragraph(html.escape(normalize_pdf_text(title)), styles["cover_title"]),
        Paragraph(
            f"Практическое руководство для {audience}<br/>"
            "Работа с реестром, аналитикой и карточками проектов",
            styles["cover_subtitle"],
        ),
        Spacer(1, 20 * mm),
        Paragraph(
            "<b>Версия:</b> 20 июля 2026<br/>"
            "<b>Формат:</b> пошаговые инструкции и рабочие сценарии",
            ParagraphStyle(
                "CoverMeta",
                parent=styles["body"],
                alignment=TA_CENTER,
                textColor=SLATE,
                leading=16,
            ),
        ),
        PageBreak(),
    ]


def markdown_to_story(path: Path, audience: str, styles, content_width: float):
    lines = path.read_text(encoding="utf-8").splitlines()
    title = lines[0].removeprefix("# ").strip()
    story = cover_story(title, audience, styles)
    paragraph_buffer: list[str] = []

    def flush_paragraph():
        if paragraph_buffer:
            text = " ".join(item.strip() for item in paragraph_buffer)
            story.append(Paragraph(inline_markup(text), styles["body"]))
            paragraph_buffer.clear()

    for raw_line in lines[1:]:
        line = raw_line.strip()
        if not line:
            flush_paragraph()
            continue

        if line.startswith("[Скриншот:") and line.endswith("]"):
            flush_paragraph()
            story.append(Spacer(1, 3 * mm))
            story.append(ScreenshotPlaceholder(line[1:-1], content_width))
            story.append(Spacer(1, 4 * mm))
        elif line.startswith("### "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[4:]), styles["h3"]))
        elif line.startswith("## "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[3:]), styles["h2"]))
        elif line.startswith("# "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[2:]), styles["h1"]))
        elif line.startswith("> "):
            flush_paragraph()
            story.append(Paragraph(inline_markup(line[2:]), styles["callout"]))
        elif line.startswith("- "):
            flush_paragraph()
            story.append(
                Paragraph(f"•&nbsp;&nbsp;{inline_markup(line[2:])}", styles["bullet"])
            )
        elif re.match(r"^\d+\. ", line):
            flush_paragraph()
            match = re.match(r"^(\d+)\.\s+(.*)$", line)
            assert match
            story.append(
                Paragraph(
                    f"<b>{match.group(1)}.</b>&nbsp;&nbsp;{inline_markup(match.group(2))}",
                    styles["bullet"],
                )
            )
        else:
            paragraph_buffer.append(line)

    flush_paragraph()
    return title, story


def draw_page(canvas, document):
    page = canvas.getPageNumber()
    width, height = A4
    canvas.saveState()

    if page == 1:
        canvas.setFillColor(PAPER)
        canvas.rect(0, 0, width, height, fill=1, stroke=0)
        canvas.setFillColor(BLUE)
        canvas.rect(0, height - 10 * mm, width, 10 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(LINE)
        canvas.line(35 * mm, 49 * mm, width - 35 * mm, 49 * mm)
    else:
        canvas.setStrokeColor(LINE)
        canvas.line(20 * mm, height - 14 * mm, width - 20 * mm, height - 14 * mm)
        canvas.setFont("GuideSans-Bold", 7.5)
        canvas.setFillColor(SLATE)
        canvas.drawString(20 * mm, height - 10.5 * mm, "AIJ PROJECT CONSOLE")
        canvas.setFont("GuideSans", 7.5)
        canvas.drawRightString(width - 20 * mm, height - 10.5 * mm, document.guide_title)

    canvas.setStrokeColor(LINE)
    canvas.line(20 * mm, 13 * mm, width - 20 * mm, 13 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("GuideSans", 7.5)
    canvas.drawString(20 * mm, 8.5 * mm, "Реестр AIJ-проектов")
    canvas.drawRightString(width - 20 * mm, 8.5 * mm, f"{page}")
    canvas.restoreState()


def generate(source_name: str, output_name: str, audience: str) -> None:
    source = GUIDES_DIR / source_name
    output = OUTPUT_DIR / output_name
    output.parent.mkdir(parents=True, exist_ok=True)

    styles = build_styles()
    document = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=18 * mm,
        title="",
        author="AIJ Project Console",
        subject="Пользовательское руководство",
    )
    content_width = A4[0] - document.leftMargin - document.rightMargin
    title, story = markdown_to_story(source, audience, styles, content_width)
    document.guide_title = title
    document.title = title
    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"Generated {output.relative_to(ROOT)}")


def main() -> None:
    register_fonts()
    generate("director-guide.md", "director-guide.pdf", "директоров")
    generate("csm-guide.md", "csm-guide.pdf", "CSM")


if __name__ == "__main__":
    main()
