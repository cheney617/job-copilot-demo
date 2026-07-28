export type ResumeFileType = "text" | "pdf" | "docx";

export interface ParsedResumeFile {
  fileName: string;
  fileType: ResumeFileType;
  text: string;
  pageCount: number | null;
  warnings: string[];
}

function normalizeText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extensionOf(fileName: string) {
  return fileName.toLowerCase().split(".").pop() ?? "";
}

async function parsePdf(file: File): Promise<ParsedResumeFile> {
  const [pdfjs, workerModule] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  const pdfWorkerUrl = workerModule.default;
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data: bytes }).promise;
  const pages: string[] = [];
  const warnings: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
    pages.push(text);
  }

  const normalized = normalizeText(pages.join("\n\n"));
  if (normalized.length < 80) {
    warnings.push("提取到的文字很少；这可能是扫描版 PDF，需要 OCR。当前不会猜测缺失内容。");
  }

  return {
    fileName: file.name,
    fileType: "pdf",
    text: normalized,
    pageCount: document.numPages,
    warnings,
  };
}

async function parseDocx(file: File): Promise<ParsedResumeFile> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  const warnings = result.messages
    .filter((message) => message.type === "warning")
    .map((message) => message.message);
  return {
    fileName: file.name,
    fileType: "docx",
    text: normalizeText(result.value),
    pageCount: null,
    warnings,
  };
}

export async function parseResumeFile(file: File): Promise<ParsedResumeFile> {
  const extension = extensionOf(file.name);
  if (["txt", "md"].includes(extension)) {
    return {
      fileName: file.name,
      fileType: "text",
      text: normalizeText(await file.text()),
      pageCount: null,
      warnings: [],
    };
  }
  if (extension === "pdf") return parsePdf(file);
  if (extension === "docx") return parseDocx(file);
  if (extension === "doc") {
    throw new Error("暂不支持旧版 .doc，请另存为 .docx 或 PDF 后导入。");
  }
  throw new Error("不支持此文件格式，请使用 PDF、DOCX、Markdown 或 TXT。");
}
