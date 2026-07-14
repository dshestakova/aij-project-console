import { formatDateTime, getDisplayValue } from "@/lib/project-registry/format";
import type {
  ProjectChangeItem,
  ProjectDetail,
  ProjectFileItem,
} from "@/types/project-registry";

type ProjectDocumentInput = {
  changes: ProjectChangeItem[];
  currentPassport: ProjectFileItem | null;
  project: ProjectDetail;
};

type TableRow = [string, string | null | undefined];

const flagshipTextFields: Array<[string, keyof ProjectDetail]> = [
  ["Что сейчас есть у клиента", "flagship_client_current_state"],
  ["Как выглядит текущий процесс", "flagship_current_process"],
  ["Что именно дорабатываем / создаем", "flagship_scope"],
  ["Как и для чего клиент это использует", "flagship_client_usage"],
  ["Кто будет пользоваться результатом", "flagship_result_users"],
  ["Технический стек", "flagship_tech_stack"],
  ["Какие данные доступны", "flagship_available_data"],
  ["Какие данные пока под вопросом", "flagship_uncertain_data"],
  ["Что точно не делаем", "flagship_out_of_scope"],
  ["Конкуренты", "flagship_competitors"],
];

const fieldLabels: Record<string, string> = {
  external_id: "ID проекта",
  client: "Клиент",
  project_name: "Название проекта",
  status_id: "Статус",
  csm_id: "CSM",
  director_id: "Директор",
  industry_unit_id: "Отраслевое управление",
  essence: "Суть проекта",
  progress: "Прогресс",
  next_step: "Следующий шаг",
  funding_status: "Статус финансирования",
  funding: "Финансирование",
  is_social: "Социальный",
  comment: "Комментарий",
  is_archived: "Архив",
  is_flagship: "Флагман",
  flagship_status_id: "Статус флагмана",
  flagship_description_uploaded: "Описание загружено",
  flagship_passport_uploaded: "Паспорт загружен",
  flagship_innovation_level: "Инновационность",
  flagship_uploaded_to_prbr: "Загружен на ПРБР",
  flagship_approved_by_ca: "Одобрен ЦА",
  flagship_client_current_state: "Что сейчас есть у клиента",
  flagship_current_process: "Как выглядит текущий процесс",
  flagship_scope: "Что именно дорабатываем / создаем",
  flagship_client_usage: "Как и для чего клиент это использует",
  flagship_result_users: "Кто будет пользоваться результатом",
  flagship_tech_stack: "Технический стек",
  flagship_available_data: "Какие данные доступны",
  flagship_uncertain_data: "Какие данные пока под вопросом",
  flagship_out_of_scope: "Что точно не делаем",
  flagship_competitors: "Конкуренты",
  "Создан проект": "Создан проект",
};

export function buildProjectDocumentDocx({
  changes,
  currentPassport,
  project,
}: ProjectDocumentInput) {
  const documentXml = buildDocumentXml(project, currentPassport, changes);
  const now = new Date().toISOString();

  return createZip([
    {
      name: "[Content_Types].xml",
      content: xmlBuffer(contentTypesXml()),
    },
    {
      name: "_rels/.rels",
      content: xmlBuffer(rootRelsXml()),
    },
    {
      name: "docProps/core.xml",
      content: xmlBuffer(corePropsXml(project, now)),
    },
    {
      name: "docProps/app.xml",
      content: xmlBuffer(appPropsXml()),
    },
    {
      name: "word/_rels/document.xml.rels",
      content: xmlBuffer(documentRelsXml()),
    },
    {
      name: "word/styles.xml",
      content: xmlBuffer(stylesXml()),
    },
    {
      name: "word/document.xml",
      content: xmlBuffer(documentXml),
    },
  ]);
}

export function getProjectDocumentFilename(project: ProjectDetail) {
  return [
    safeFilenamePart(project.external_id),
    safeFilenamePart(project.project_name ?? project.client ?? "project"),
    "project-document.docx",
  ]
    .filter(Boolean)
    .join("-");
}

function buildDocumentXml(
  project: ProjectDetail,
  currentPassport: ProjectFileItem | null,
  changes: ProjectChangeItem[],
) {
  const documentParts = [
    paragraph("Проектный документ", "Title"),
    paragraph(
      `${project.external_id} · ${display(project.project_name)}`,
      "Subtitle",
    ),
    table([
      ["ID проекта", project.external_id],
      ["Название проекта", project.project_name],
      ["Клиент", project.client],
      ["Статус", project.status?.name],
      ["Отраслевое управление", project.industry_unit?.name],
      ["Флагман", bool(project.is_flagship)],
      ["Статус флагмана", project.flagship_status?.name],
      ["Социальный", project.is_social ? "да" : "нет"],
      ["Архив", bool(project.is_archived)],
      ["Дата последнего обновления", formatDateTime(project.updated_at)],
    ]),
    heading("Краткая информация"),
    table([
      ["Суть проекта", project.essence],
      ["Прогресс", project.progress],
      ["Следующий шаг", project.next_step],
      ["Комментарий", project.comment],
    ]),
    heading("Ответственные и финансы"),
    table([
      ["CSM", project.csm?.full_name],
      ["Директор", project.director?.full_name],
      ["Отраслевое управление", project.industry_unit?.name],
      ["Финансирование", project.funding],
      ["Статус финансирования", project.funding_status],
      ["Финансирование комментарий", project.funding],
      ["Социальный", bool(project.is_social)],
    ]),
    heading("Флагманский проект"),
    project.is_flagship
      ? table([
          ["Статус флагмана", project.flagship_status?.name],
          ["Описание загружено", bool(project.flagship_description_uploaded)],
          ["Паспорт загружен", bool(project.flagship_passport_uploaded)],
          ["Инновационность", project.flagship_innovation_level],
          ["Загружен на ПРБР", bool(project.flagship_uploaded_to_prbr)],
          ["Одобрен ЦА", bool(project.flagship_approved_by_ca)],
        ])
      : paragraph("Проект не отмечен как флагманский."),
    ...(project.is_flagship
      ? flagshipTextFields.flatMap(([label, key]) => [
          heading(label, "Heading3"),
          paragraph(display(project[key] as string | null | undefined)),
        ])
      : []),
    heading("Паспорт проекта"),
    table([
      ["Паспорт загружен", bool(project.flagship_passport_uploaded)],
      ["Имя файла", currentPassport?.file_name],
      ["Дата загрузки", formatDateTime(currentPassport?.uploaded_at)],
      [
        "Кто загрузил",
        currentPassport?.profile?.display_name ?? currentPassport?.profile?.email,
      ],
    ]),
    heading("История изменений"),
    buildHistory(changes),
    sectionProperties(),
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${documentParts.join("")}</w:body>
</w:document>`;
}

function buildHistory(changes: ProjectChangeItem[]) {
  if (changes.length === 0) {
    return paragraph("История изменений пока пустая.");
  }

  return table(
    changes.slice(0, 30).map((change) => [
      formatDateTime(change.changed_at),
      [
        change.profile?.display_name ??
          change.profile?.email ??
          "Пользователь",
        getFieldLabel(change.field_name),
      ].join(" — "),
    ]),
  );
}

function heading(text: string, style = "Heading2") {
  return paragraph(text, style);
}

function paragraph(text: string, style?: string) {
  const styleXml = style
    ? `<w:pPr><w:pStyle w:val="${escapeXml(style)}"/></w:pPr>`
    : "";
  const runs = String(text)
    .split(/\r?\n/)
    .map((line, index) => {
      const breakXml = index === 0 ? "" : "<w:br/>";
      return `<w:r>${breakXml}<w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>`;
    })
    .join("");

  return `<w:p>${styleXml}${runs}</w:p>`;
}

function table(rows: TableRow[]) {
  return `<w:tbl>
    <w:tblPr>
      <w:tblW w:w="5000" w:type="pct"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="6" w:space="0" w:color="D8DEE9"/>
        <w:left w:val="single" w:sz="6" w:space="0" w:color="D8DEE9"/>
        <w:bottom w:val="single" w:sz="6" w:space="0" w:color="D8DEE9"/>
        <w:right w:val="single" w:sz="6" w:space="0" w:color="D8DEE9"/>
        <w:insideH w:val="single" w:sz="6" w:space="0" w:color="D8DEE9"/>
        <w:insideV w:val="single" w:sz="6" w:space="0" w:color="D8DEE9"/>
      </w:tblBorders>
    </w:tblPr>
    ${rows.map(([label, value]) => tableRow(label, display(value))).join("")}
  </w:tbl>`;
}

function tableRow(label: string, value: string) {
  return `<w:tr>
    ${tableCell(label, true)}
    ${tableCell(value)}
  </w:tr>`;
}

function tableCell(value: string, isLabel = false) {
  const shading = isLabel ? '<w:shd w:fill="F5F7FB"/>' : "";
  const bold = isLabel ? "<w:b/>" : "";

  return `<w:tc>
    <w:tcPr><w:tcW w:w="${isLabel ? "32" : "68"}" w:type="pct"/>${shading}</w:tcPr>
    <w:p><w:r><w:rPr>${bold}</w:rPr><w:t xml:space="preserve">${escapeXml(
      value,
    )}</w:t></w:r></w:p>
  </w:tc>`;
}

function sectionProperties() {
  return `<w:sectPr>
    <w:pgSz w:w="11906" w:h="16838"/>
    <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/>
  </w:sectPr>`;
}

function display(value: string | null | undefined) {
  return getDisplayValue(value);
}

function bool(value: boolean | null | undefined) {
  return value ? "да" : "нет";
}

function getFieldLabel(fieldName: string) {
  return fieldLabels[fieldName] ?? fieldName;
}

function safeFilenamePart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll("ё", "е")
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function xmlBuffer(value: string) {
  return Buffer.from(value, "utf8");
}

function contentTypesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;
}

function documentRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function corePropsXml(project: ProjectDetail, timestamp: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(project.external_id)} — ${escapeXml(
    display(project.project_name),
  )}</dc:title>
  <dc:creator>AIJ Project Console</dc:creator>
  <cp:lastModifiedBy>AIJ Project Console</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${timestamp}</dcterms:modified>
</cp:coreProperties>`;
}

function appPropsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>AIJ Project Console</Application>
</Properties>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/></w:rPr>
    <w:pPr><w:spacing w:after="160"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:rPr><w:b/><w:sz w:val="34"/><w:color w:val="0F172A"/></w:rPr>
    <w:pPr><w:spacing w:after="120"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Subtitle">
    <w:name w:val="Subtitle"/>
    <w:rPr><w:sz w:val="24"/><w:color w:val="475569"/></w:rPr>
    <w:pPr><w:spacing w:after="260"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="0F172A"/></w:rPr>
    <w:pPr><w:spacing w:before="260" w:after="120"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:rPr><w:b/><w:sz w:val="24"/><w:color w:val="334155"/></w:rPr>
    <w:pPr><w:spacing w:before="180" w:after="80"/></w:pPr>
  </w:style>
</w:styles>`;
}

type ZipFile = {
  name: string;
  content: Buffer;
};

function createZip(files: ZipFile[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.content);
    const localHeader = Buffer.alloc(30);

    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(file.content.length, 18);
    localHeader.writeUInt32LE(file.content.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, file.content);

    const centralHeader = Buffer.alloc(46);

    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(file.content.length, 20);
    centralHeader.writeUInt32LE(file.content.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralParts.push(centralHeader, name);
    offset += localHeader.length + name.length + file.content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);

  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
