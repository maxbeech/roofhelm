// Lays a ProReport out as a PDF with pdf-lib (pure JS, no fonts or binaries to
// ship). The built-in PDF fonts only encode WinAnsi, so every string goes
// through pdfSafe first: the few engine symbols outside that set get plain
// words, and anything else becomes "?" rather than throwing at the buyer.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ProReport, ReportRow, ReportSection } from "./pro-report";

// --- text safety -----------------------------------------------------------

// Code points the WinAnsi (Windows-1252) built-in fonts can draw.
const WIN_ANSI_EXTRA = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d,
  0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);
const encodable = (cp: number) => (cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa1 && cp <= 0xff && cp !== 0xad) || WIN_ANSI_EXTRA.has(cp);

// Symbols the calculator's own text uses that WinAnsi lacks.
const WORDS: Record<string, string> = {
  "≈": "about", "≤": "<=", "≥": ">=", "γ": "gamma", "√": "sqrt", "→": "to", "−": "-",
  " ": " ", " ": " ", " ": " ", "‑": "-", "­": "",
};

/** Text the built-in fonts can draw. Second value is true when something had to become "?". */
export function pdfSafeChecked(text: string): { text: string; lossy: boolean } {
  let out = "";
  let lossy = false;
  for (const ch of text.normalize("NFC")) {
    const word = WORDS[ch];
    if (word !== undefined) out += word;
    else if (ch === "\n" || ch === "\t") out += " ";
    else if (encodable(ch.codePointAt(0) as number)) out += ch;
    else { out += "?"; lossy = true; }
  }
  return { text: out, lossy };
}
export const pdfSafe = (text: string): string => pdfSafeChecked(text).text;

// --- layout ----------------------------------------------------------------

const PAGE_W = 612, PAGE_H = 792; // US Letter, points
const MARGIN = { left: 54, right: 54, top: 54, bottom: 62 };
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right;

// Site tokens (app/globals.css), as 0..1 RGB.
const INK = rgb(0.114, 0.102, 0.071);
const MUTED = rgb(0.424, 0.392, 0.314);
const RULE = rgb(0.82, 0.78, 0.69);
const ACCENT = rgb(0.129, 0.263, 0.31);

interface Fonts { sans: PDFFont; sansBold: PDFFont; sansItalic: PDFFont; serifBold: PDFFont; mono: PDFFont }

/** Greedy word wrap by measured width. A single token wider than the line is cut by character. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth;
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (!line) {
      line = word;
    } else if (fits(`${line} ${word}`)) {
      line = `${line} ${word}`;
      continue;
    } else {
      lines.push(line);
      line = word;
    }
    while (!fits(line)) {
      let cut = line.length - 1;
      while (cut > 1 && !fits(line.slice(0, cut))) cut--;
      lines.push(line.slice(0, cut));
      line = line.slice(cut);
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

class Flow {
  pages: PDFPage[] = [];
  page!: PDFPage;
  y = 0;
  constructor(private doc: PDFDocument, readonly f: Fonts) { this.newPage(); }

  newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.pages.push(this.page);
    this.y = PAGE_H - MARGIN.top;
  }
  /** Start a new page unless `height` points still fit above the bottom margin. */
  ensure(height: number) { if (this.y - height < MARGIN.bottom) this.newPage(); }

  text(s: string, x: number, y: number, font: PDFFont, size: number, color = INK) {
    this.page.drawText(pdfSafe(s), { x, y, font, size, color });
  }
  rule(thickness = 0.5, color = RULE, gapAfter = 0) {
    this.page.drawLine({ start: { x: MARGIN.left, y: this.y }, end: { x: PAGE_W - MARGIN.right, y: this.y }, thickness, color });
    this.y -= gapAfter;
  }
  /** Wrapped paragraph at the left margin (plus indent). */
  paragraph(s: string, font: PDFFont, size: number, opts: { color?: typeof INK; indent?: number; lead?: number; gap?: number } = {}) {
    const lead = opts.lead ?? size * 1.4;
    const x = MARGIN.left + (opts.indent ?? 0);
    for (const line of wrap(pdfSafe(s), font, size, CONTENT_W - (opts.indent ?? 0))) {
      this.ensure(lead);
      this.y -= lead;
      this.text(line, x, this.y, font, size, opts.color);
    }
    this.y -= opts.gap ?? 0;
  }
  bullet(s: string, size = 9.5) {
    const indent = 14, lead = size * 1.4;
    const lines = wrap(pdfSafe(s), this.f.sans, size, CONTENT_W - indent);
    this.ensure(lead * Math.min(lines.length, 2));
    lines.forEach((line, i) => {
      this.ensure(lead);
      this.y -= lead;
      if (i === 0) this.page.drawCircle({ x: MARGIN.left + 4, y: this.y + size * 0.32, size: 1.4, color: ACCENT });
      this.text(line, MARGIN.left + indent, this.y, this.f.sans, size);
    });
    this.y -= 3;
  }
  heading(s: string) {
    this.ensure(70); // keep a heading with the first lines under it
    this.y -= 8;
    this.text(s, MARGIN.left, this.y - 12, this.f.serifBold, 13, INK);
    this.y -= 17;
    this.rule(0.75, INK, 4);
  }
  /** label | value | note, one hairline per row. */
  row({ label, value, note }: ReportRow, strong = false) {
    const size = 9.5, lead = 11.5;
    const colLabel = 188, colValue = 140, gap = 8;
    const xValue = MARGIN.left + colLabel + gap;
    const xNote = xValue + colValue + gap;
    const noteW = PAGE_W - MARGIN.right - xNote;
    const labelLines = wrap(pdfSafe(label), this.f.sans, size, colLabel);
    const valueLines = wrap(pdfSafe(value), this.f.sansBold, size, colValue);
    const noteLines = note ? wrap(pdfSafe(note), this.f.sans, 8, noteW) : [];
    const lines = Math.max(labelLines.length, valueLines.length, noteLines.length);
    this.ensure(lines * lead + 6);
    const top = this.y - 4;
    labelLines.forEach((l, i) => this.text(l, MARGIN.left, top - lead * (i + 1) + 3, this.f.sans, size, MUTED));
    valueLines.forEach((l, i) => this.text(l, xValue, top - lead * (i + 1) + 3, this.f.sansBold, size, strong ? ACCENT : INK));
    noteLines.forEach((l, i) => this.text(l, xNote, top - lead * (i + 1) + 3, this.f.sans, 8, MUTED));
    this.y = top - lead * lines - 1;
    this.rule(0.4, RULE);
  }
  section(s: ReportSection) {
    this.heading(s.title);
    for (const row of s.rows ?? []) this.row(row, row.label.startsWith("Design roof snow load"));
    if (s.rows?.length) this.y -= 3;
    for (const p of s.paragraphs ?? []) this.paragraph(p, this.f.sans, 9.5, { gap: 4 });
    for (const b of s.bullets ?? []) this.bullet(b);
  }
}

export async function renderReportPdf(report: ProReport): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  const stamp = new Date(`${report.date}T00:00:00Z`);
  doc.setTitle(pdfSafe(report.title));
  doc.setSubject(pdfSafe(`${report.subtitle}. Design roof snow load ${report.result.designPsf} psf.`));
  doc.setAuthor("RoofHelm");
  doc.setCreator("RoofHelm");
  doc.setProducer("RoofHelm");
  doc.setCreationDate(stamp);
  doc.setModificationDate(stamp);

  const f: Fonts = {
    sans: await doc.embedFont(StandardFonts.Helvetica),
    sansBold: await doc.embedFont(StandardFonts.HelveticaBold),
    sansItalic: await doc.embedFont(StandardFonts.HelveticaOblique),
    serifBold: await doc.embedFont(StandardFonts.TimesRomanBold),
    mono: await doc.embedFont(StandardFonts.Courier),
  };
  const flow = new Flow(doc, f);

  // Masthead
  flow.page.drawRectangle({ x: MARGIN.left, y: flow.y - 2, width: CONTENT_W, height: 2, color: INK });
  flow.y -= 16;
  flow.text("ROOFHELM", MARGIN.left, flow.y, f.sansBold, 8.5, ACCENT);
  const dateLabel = report.date;
  flow.text(dateLabel, PAGE_W - MARGIN.right - f.sans.widthOfTextAtSize(dateLabel, 8.5), flow.y, f.sans, 8.5, MUTED);
  flow.y -= 30;
  flow.text(report.title, MARGIN.left, flow.y, f.serifBold, 26, INK);
  flow.y -= 16;
  flow.text(report.subtitle, MARGIN.left, flow.y, f.sans, 10, MUTED);
  flow.y -= 14;

  // Project and site (from the Checkout form; blank is stated, not invented)
  for (const [label, value] of [["Project", report.project.name], ["Site", report.project.site]] as const) {
    flow.row({ label, value: value || "not provided" });
  }
  flow.y -= 8;

  // Result block
  const boxH = 68;
  flow.ensure(boxH + 10);
  const boxTop = flow.y;
  flow.page.drawRectangle({ x: MARGIN.left, y: boxTop - boxH, width: CONTENT_W, height: boxH, borderColor: INK, borderWidth: 1.4 });
  flow.text("DESIGN ROOF SNOW LOAD", MARGIN.left + 14, boxTop - 20, f.sansBold, 8, MUTED);
  const big = `${report.result.designPsf}`;
  flow.text(big, MARGIN.left + 14, boxTop - 54, f.serifBold, 34, ACCENT);
  flow.text("psf", MARGIN.left + 14 + f.serifBold.widthOfTextAtSize(big, 34) + 6, boxTop - 54, f.sans, 13, MUTED);
  const textX = MARGIN.left + 200;
  wrap(pdfSafe(report.result.text), f.sans, 9.5, CONTENT_W - 200 - 14).slice(0, 4)
    .forEach((line, i) => flow.text(line, textX, boxTop - 28 - i * 13, f.sans, 9.5, INK));
  flow.y = boxTop - boxH - 6;

  for (const section of report.sections) flow.section(section);

  // Closing: disclaimer and the way back into the calculator
  flow.heading("Read before you rely on this");
  for (const p of report.disclaimer) flow.paragraph(p, f.sansItalic, 9, { gap: 4 });
  flow.paragraph("Reopen these numbers in the calculator:", f.sans, 9, { color: MUTED });
  flow.paragraph(report.reproduceUrl, f.mono, 7.5, { color: ACCENT, lead: 10.5 });

  // Footer on every page, once the page count is known.
  const total = flow.pages.length;
  flow.pages.forEach((page, i) => {
    page.drawLine({ start: { x: MARGIN.left, y: 44 }, end: { x: PAGE_W - MARGIN.right, y: 44 }, thickness: 0.4, color: RULE });
    const left = pdfSafe(`RoofHelm · ${report.title}${report.project.name ? ` · ${report.project.name}` : ""}`);
    const right = `Page ${i + 1} of ${total}`;
    const leftFit = wrap(left, f.sans, 7.5, CONTENT_W - 80)[0];
    page.drawText(leftFit, { x: MARGIN.left, y: 32, size: 7.5, font: f.sans, color: MUTED });
    page.drawText(right, { x: PAGE_W - MARGIN.right - f.sans.widthOfTextAtSize(right, 7.5), y: 32, size: 7.5, font: f.sans, color: MUTED });
  });

  return doc.save();
}
