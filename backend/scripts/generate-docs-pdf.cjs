const fs = require("node:fs");
const path = require("node:path");
const PDFDocument = require("pdfkit");

const root = path.resolve(__dirname, "..", "..");
const documents = [
  {
    source: "README.md",
    output: "docs/CV-Optimizer-Project-Overview.pdf",
    label: "PUBLIC PROJECT OVERVIEW",
  },
  {
    source: "docs/TECHNICAL_GUIDE.md",
    output: "docs/Technical-Guide-ID.pdf",
    label: "PANDUAN TEKNIS - BAHASA INDONESIA",
  },
];

const colors = {
  ink: "#14251F",
  muted: "#66756F",
  green: "#20705B",
  pale: "#EFF5F1",
  line: "#DCE6E0",
  white: "#FFFFFF",
};

function plainText(value) {
  return value
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/→/g, "->")
    .replace(/•/g, "-")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?")
    .trim();
}

function parseMarkdown(markdown) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let title = "CV Optimizer";
  let subtitle = "";
  let firstHeading = -1;

  for (let index = 0; index < lines.length; index += 1) {
    if (/^# /.test(lines[index])) {
      title = plainText(lines[index].slice(2));
      firstHeading = index;
      break;
    }
  }

  let contentStart = firstHeading + 1;
  while (contentStart < lines.length && !lines[contentStart].trim()) {
    contentStart += 1;
  }
  if (contentStart < lines.length && !/^#{1,6} /.test(lines[contentStart])) {
    subtitle = plainText(lines[contentStart]);
    contentStart += 1;
  }

  return { title, subtitle, lines: lines.slice(contentStart) };
}

function addCover(doc, title, subtitle, label) {
  const { width, height } = doc.page;
  doc.rect(0, 0, width, height).fill(colors.pale);
  doc.rect(0, 0, width, 16).fill(colors.green);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colors.green)
    .text("CV OPTIMIZER  /  DOCUMENTATION", 58, 92, { characterSpacing: 1.4 });
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(colors.muted)
    .text(label, 58, 145, { width: width - 116 });
  doc
    .font("Helvetica-Bold")
    .fontSize(32)
    .fillColor(colors.ink)
    .text(title, 58, 184, { width: width - 116, lineGap: 5 });
  doc
    .font("Helvetica")
    .fontSize(13)
    .fillColor(colors.muted)
    .text(subtitle, 58, doc.y + 20, {
      width: width - 116,
      lineGap: 5,
    });
  doc
    .moveTo(58, height - 105)
    .lineTo(width - 58, height - 105)
    .lineWidth(1)
    .strokeColor(colors.line)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colors.muted)
    .text("Prepared from the project documentation. See the Markdown source in docs/.", 58, height - 84, {
      width: width - 116,
    });
}

function ensureSpace(doc, needed = 40) {
  if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function renderCodeBlock(doc, lines) {
  const fontSize = 8;
  const lineGap = 2;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right - 20;
  const content = lines.map((line) => plainText(line)).join("\n");
  doc.font("Courier").fontSize(fontSize);
  const height = Math.max(30, doc.heightOfString(content || " ", { width, lineGap }) + 18);
  ensureSpace(doc, Math.min(height, 120));
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
  const y = doc.y;
  doc
    .roundedRect(doc.page.margins.left, y, width + 20, height, 4)
    .fill(colors.pale);
  doc
    .font("Courier")
    .fontSize(fontSize)
    .lineGap(lineGap)
    .fillColor(colors.ink)
    .text(content || " ", doc.page.margins.left + 10, y + 9, {
      width,
      lineBreak: true,
    });
  doc.y = y + height + 12;
  doc.lineGap(0);
}

function renderTableLine(doc, line) {
  if (/^\|?[\s:|-]+\|?$/.test(line.trim())) return;
  const cells = line.split("|").map((cell) => plainText(cell)).filter(Boolean);
  if (!cells.length) return;
  const text = cells.join("  |  ");
  ensureSpace(doc, 36);
  doc.font("Helvetica").fontSize(9).fillColor(colors.ink);
  doc.text(text, { width: doc.page.width - 116, lineGap: 2 });
  doc.moveDown(0.35);
}

function renderContent(doc, lines) {
  let paragraph = [];
  let inCode = false;
  let codeLines = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = plainText(paragraph.join(" "));
    paragraph = [];
    if (!text) return;
    ensureSpace(doc, 42);
    doc.font("Helvetica").fontSize(10).fillColor(colors.ink);
    doc.text(text, { width: doc.page.width - 116, lineGap: 3, paragraphGap: 5 });
    doc.moveDown(0.45);
  };

  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      flushParagraph();
      if (inCode) {
        renderCodeBlock(doc, codeLines);
        codeLines = [];
      }
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      const level = heading[1].length;
      const label = plainText(heading[2]);
      const spaceNeeded = level === 2 ? 58 : 42;
      ensureSpace(doc, spaceNeeded);
      doc.moveDown(level === 2 ? 0.65 : 0.35);
      doc
        .font("Helvetica-Bold")
        .fontSize(level === 2 ? 17 : level === 3 ? 12 : 10)
        .fillColor(level === 2 ? colors.green : colors.ink)
        .text(label, { width: doc.page.width - 116, lineGap: 3 });
      if (level === 2) {
        doc
          .moveTo(doc.page.margins.left, doc.y + 5)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y + 5)
          .lineWidth(0.7)
          .strokeColor(colors.line)
          .stroke();
        doc.moveDown(0.55);
      } else {
        doc.moveDown(0.3);
      }
      continue;
    }

    if (/^\s*\|/.test(line)) {
      flushParagraph();
      renderTableLine(doc, line);
      continue;
    }
    if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
      flushParagraph();
      doc.moveDown(0.25);
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flushParagraph();
      const quote = plainText(line.replace(/^\s*>\s?/, ""));
      ensureSpace(doc, 42);
      const y = doc.y;
      doc.font("Helvetica-Oblique").fontSize(9.5);
      const height = doc.heightOfString(quote, { width: doc.page.width - 142, lineGap: 3 });
      doc
        .moveTo(doc.page.margins.left + 3, y)
        .lineTo(doc.page.margins.left + 3, y + height + 4)
        .lineWidth(2)
        .strokeColor(colors.green)
        .stroke();
      doc
        .fillColor(colors.muted)
        .text(quote, doc.page.margins.left + 14, y, {
          width: doc.page.width - 142,
          lineGap: 3,
        });
      doc.y = y + height + 10;
      continue;
    }

    const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
    const numbered = line.match(/^\s*(\d+)\.\s+(.+)$/);
    if (bullet || numbered) {
      flushParagraph();
      const text = plainText((bullet || numbered)[bullet ? 1 : 2]);
      ensureSpace(doc, 32);
      doc.font("Helvetica").fontSize(9.5).fillColor(colors.ink);
      doc.text(`${bullet ? "-" : `${numbered[1]}.`}  ${text}`, {
        width: doc.page.width - 132,
        indent: 4,
        lineGap: 2,
      });
      doc.moveDown(0.25);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    paragraph.push(line.trim());
  }

  flushParagraph();
  if (inCode && codeLines.length) renderCodeBlock(doc, codeLines);
}

function addPageFurniture(doc, title) {
  const range = doc.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    doc.switchToPage(index);
    if (index === 0) continue;
    const page = doc.page;
    const originalBottomMargin = page.margins.bottom;
    page.margins.bottom = 12;
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(colors.muted)
      .text(title, page.margins.left, 30, {
        width: page.width - 116,
        lineBreak: false,
      });
    doc
      .moveTo(doc.page.margins.left, 48)
      .lineTo(doc.page.width - doc.page.margins.right, 48)
      .lineWidth(0.5)
      .strokeColor(colors.line)
      .stroke();
    doc
      .moveTo(doc.page.margins.left, doc.page.height - 42)
      .lineTo(doc.page.width - doc.page.margins.right, doc.page.height - 42)
      .lineWidth(0.5)
      .strokeColor(colors.line)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(colors.muted)
      .text("CV Optimizer  |  Documentation", page.margins.left, page.height - 30, {
        lineBreak: false,
      });
    doc.text(`${index + 1}`, page.width - page.margins.right - 20, page.height - 30, {
      width: 20,
      align: "right",
      lineBreak: false,
    });
    page.margins.bottom = originalBottomMargin;
  }
  if (doc.bufferedPageRange().count !== range.count) {
    throw new Error("PDF footer rendering unexpectedly added pages.");
  }
}

async function generate(document) {
  const sourcePath = path.join(root, document.source);
  const outputPath = path.join(root, document.output);
  const markdown = fs.readFileSync(sourcePath, "utf8");
  const { title, subtitle, lines } = parseMarkdown(markdown);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const pdf = new PDFDocument({
    size: "A4",
    margins: { top: 68, right: 58, bottom: 60, left: 58 },
    bufferPages: true,
    info: {
      Title: title,
      Subject: "CV Optimizer project documentation",
      Author: "CV Optimizer",
      Creator: "CV Optimizer documentation generator",
    },
  });
  const output = fs.createWriteStream(outputPath);
  const finished = new Promise((resolve, reject) => {
    output.once("finish", resolve);
    output.once("error", reject);
    pdf.once("error", reject);
  });
  pdf.pipe(output);
  addCover(pdf, title, subtitle, document.label);
  pdf.addPage();
  renderContent(pdf, lines);
  addPageFurniture(pdf, title);
  pdf.end();
  await finished;
  console.log(`Created ${path.relative(root, outputPath)}`);
}

async function main() {
  for (const document of documents) {
    await generate(document);
  }
}

main().catch((error) => {
  console.error("Failed to generate documentation PDFs:", error);
  process.exitCode = 1;
});
