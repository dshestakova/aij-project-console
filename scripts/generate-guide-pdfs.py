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
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

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
    pdfmetrics.registerFont(TTFont("DirectorOneSans", str(regular)))
    pdfmetrics.registerFont(TTFont("DirectorOneSans-Bold", str(bold)))
    pdfmetrics.registerFont(TTFont("CsmOneSans", str(regular)))
    pdfmetrics.registerFont(TTFont("CsmOneSans-Bold", str(bold)))
    pdfmetrics.registerFontFamily(
        "GuideSans",
        normal="GuideSans",
        bold="GuideSans-Bold",
    )
    pdfmetrics.registerFontFamily(
        "DirectorOneSans",
        normal="DirectorOneSans",
        bold="DirectorOneSans-Bold",
    )
    pdfmetrics.registerFontFamily(
        "CsmOneSans",
        normal="CsmOneSans",
        bold="CsmOneSans-Bold",
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
        "image_caption": ParagraphStyle(
            "ImageCaption",
            parent=styles["BodyText"],
            fontName="GuideSans",
            fontSize=8.2,
            leading=11,
            alignment=TA_CENTER,
            textColor=MUTED,
            spaceBefore=4,
            spaceAfter=9,
        ),
        "toc_title": ParagraphStyle(
            "TocTitle",
            parent=styles["Heading1"],
            fontName="GuideSans-Bold",
            fontSize=20,
            leading=25,
            textColor=NAVY,
            spaceAfter=12,
        ),
    }


def build_one_page_styles(font_family: str):
    styles = getSampleStyleSheet()
    return {
        "kicker": ParagraphStyle(
            "OnePageKicker",
            parent=styles["Normal"],
            fontName=f"{font_family}-Bold",
            fontSize=8,
            leading=10,
            textColor=BLUE,
            spaceAfter=8,
        ),
        "title": ParagraphStyle(
            "OnePageTitle",
            parent=styles["Title"],
            fontName=f"{font_family}-Bold",
            fontSize=20,
            leading=23,
            textColor=NAVY,
            spaceAfter=4,
        ),
        "subtitle": ParagraphStyle(
            "OnePageSubtitle",
            parent=styles["Normal"],
            fontName=font_family,
            fontSize=10,
            leading=13,
            textColor=SLATE,
            spaceAfter=11,
        ),
        "card_title": ParagraphStyle(
            "OnePageCardTitle",
            parent=styles["Heading2"],
            fontName=f"{font_family}-Bold",
            fontSize=11.2,
            leading=14,
            textColor=BLUE,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "OnePageBullet",
            parent=styles["BodyText"],
            fontName=font_family,
            fontSize=8.35,
            leading=11.3,
            leftIndent=8,
            firstLineIndent=-6,
            textColor=NAVY,
            spaceAfter=3.5,
        ),
        "callout": ParagraphStyle(
            "OnePageCallout",
            parent=styles["BodyText"],
            fontName=font_family,
            fontSize=8.1,
            leading=10.8,
            textColor=colors.HexColor("#5E430E"),
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


def parse_one_page_markdown(path: Path):
    lines = path.read_text(encoding="utf-8").splitlines()
    title = lines[0].removeprefix("# ").strip()
    subtitle = next((line.strip() for line in lines[1:] if line.strip()), "")
    sections: list[tuple[str, list[tuple[str, str]]]] = []
    current_title = ""
    current_items: list[tuple[str, str]] = []

    for raw_line in lines[2:]:
        line = raw_line.strip()
        if line.startswith("## "):
            if current_title:
                sections.append((current_title, current_items))
            current_title = line[3:].strip()
            current_items = []
        elif line.startswith("- "):
            current_items.append(("bullet", line[2:].strip()))
        elif line.startswith("> "):
            current_items.append(("callout", line[2:].strip()))
        elif line and current_title:
            current_items.append(("bullet", line))

    if current_title:
        sections.append((current_title, current_items))
    return title, subtitle, sections


def one_page_card(title: str, items: list[tuple[str, str]], styles, width: float):
    content = [Paragraph(inline_markup(title), styles["card_title"])]
    for kind, value in items:
        if kind == "callout":
            callout = Table(
                [[Paragraph(inline_markup(value), styles["callout"])]],
                colWidths=[width - 8 * mm],
            )
            callout.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), AMBER_LIGHT),
                        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#E9C66A")),
                        ("LEFTPADDING", (0, 0), (-1, -1), 6),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                        ("TOPPADDING", (0, 0), (-1, -1), 5),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ]
                )
            )
            content.extend([Spacer(1, 2), callout])
        else:
            content.append(
                Paragraph(f"•&nbsp;&nbsp;{inline_markup(value)}", styles["bullet"])
            )

    card = Table([[content]], colWidths=[width])
    card.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), WHITE),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        )
    )
    return card


def draw_one_page(canvas, document):
    width, height = A4
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, width, height, fill=1, stroke=0)
    canvas.setFillColor(BLUE)
    canvas.rect(0, height - 6 * mm, width, 6 * mm, fill=1, stroke=0)
    canvas.setStrokeColor(LINE)
    canvas.line(12 * mm, 10 * mm, width - 12 * mm, 10 * mm)
    canvas.setFont(document.one_page_font, 7)
    canvas.setFillColor(MUTED)
    canvas.drawString(12 * mm, 6.5 * mm, "Внутренняя памятка • AIJ Project Console")
    canvas.drawRightString(width - 12 * mm, 6.5 * mm, "Июль 2026")
    canvas.restoreState()


def generate_one_page(source_name: str, output_name: str, role: str) -> None:
    source = GUIDES_DIR / "one-page" / source_name
    output = OUTPUT_DIR / output_name
    output.parent.mkdir(parents=True, exist_ok=True)
    font_family = "DirectorOneSans" if role == "директоров" else "CsmOneSans"
    styles = build_one_page_styles(font_family)
    title, subtitle, sections = parse_one_page_markdown(source)

    document = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=12 * mm,
        rightMargin=12 * mm,
        topMargin=11 * mm,
        bottomMargin=13 * mm,
        title=title,
        author="AIJ Project Console",
        subject=f"Краткий гайд для {role}",
    )
    content_width = A4[0] - document.leftMargin - document.rightMargin
    document.one_page_font = font_family
    gap = 4 * mm
    column_width = (content_width - gap) / 2
    columns: list[list] = [[], []]
    split_at = (len(sections) + 1) // 2

    for index, (section_title, items) in enumerate(sections):
        column = 0 if index < split_at else 1
        if columns[column]:
            columns[column].append(Spacer(1, 4 * mm))
        columns[column].append(one_page_card(section_title, items, styles, column_width))

    layout = Table(
        [[columns[0], columns[1]]],
        colWidths=[column_width, column_width],
        hAlign="LEFT",
    )
    layout.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (0, -1), 0),
                ("RIGHTPADDING", (0, 0), (0, -1), gap / 2),
                ("LEFTPADDING", (1, 0), (1, -1), gap / 2),
                ("RIGHTPADDING", (1, 0), (1, -1), 0),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story = [
        Paragraph("БЫСТРЫЙ СТАРТ • 1 СТРАНИЦА", styles["kicker"]),
        Paragraph(html.escape(normalize_pdf_text(title)), styles["title"]),
        Paragraph(html.escape(normalize_pdf_text(subtitle)), styles["subtitle"]),
        layout,
    ]
    document.build(story, onFirstPage=draw_one_page)
    print(f"Generated {output.relative_to(ROOT)}")


def cover_story(title: str, audience: str, styles):
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(
            "TocLevel1",
            fontName="GuideSans",
            fontSize=10,
            leading=15,
            textColor=NAVY,
            leftIndent=0,
            firstLineIndent=0,
            spaceBefore=3,
        )
    ]
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
        Paragraph("Содержание", styles["toc_title"]),
        toc,
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

        image_match = re.match(r"^!\[(.+?)\]\((.+?)\)$", line)
        if image_match:
            flush_paragraph()
            caption = image_match.group(1).strip()
            image_path = (path.parent / image_match.group(2).strip()).resolve()
            if not image_path.exists():
                raise RuntimeError(f"Guide screenshot not found: {image_path}")
            screenshot = Image(str(image_path))
            max_height = 132 * mm
            scale = min(
                content_width / screenshot.imageWidth,
                max_height / screenshot.imageHeight,
                1,
            )
            screenshot.drawWidth = screenshot.imageWidth * scale
            screenshot.drawHeight = screenshot.imageHeight * scale
            screenshot.hAlign = "CENTER"
            story.append(Spacer(1, 3 * mm))
            story.append(
                KeepTogether(
                    [
                        screenshot,
                        Paragraph(inline_markup(caption), styles["image_caption"]),
                    ]
                )
            )
        elif line.startswith("[Скриншот:"):
            raise RuntimeError(
                f"Screenshot placeholder remains in {path.name}: {line}"
            )
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


class GuideDocTemplate(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if not isinstance(flowable, Paragraph) or flowable.style.name != "H2":
            return
        text = flowable.getPlainText()
        key = f"section-{self.page}-{abs(hash(text))}"
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text, key, level=0, closed=False)
        self.notify("TOCEntry", (0, text, self.page, key))


def generate(source_name: str, output_name: str, audience: str) -> None:
    source = GUIDES_DIR / source_name
    output = OUTPUT_DIR / output_name
    output.parent.mkdir(parents=True, exist_ok=True)

    styles = build_styles()
    document = GuideDocTemplate(
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
    document.multiBuild(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"Generated {output.relative_to(ROOT)}")


def main() -> None:
    register_fonts()
    generate("director-guide.md", "director-guide.pdf", "директоров")
    generate("csm-guide.md", "csm-guide.pdf", "CSM")
    generate_one_page(
        "director-one-page.md", "director-one-page.pdf", "директоров"
    )
    generate_one_page("csm-one-page.md", "csm-one-page.pdf", "CSM")


if __name__ == "__main__":
    main()
