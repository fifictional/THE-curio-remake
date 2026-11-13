import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { MemoryBlockRecord } from './types';
import { formatTopicDisplayName } from './topic-similarity';

export interface ProfilePdfInput {
  ownerName?: string;
  education?: string;
  academicYear?: string;
  major?: string;
  goal?: string;
  interests?: string[];
  gaps: MemoryBlockRecord[];
  mastered: MemoryBlockRecord[];
  sessionCount: number;
}

function wrapLine(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxLen) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildLearningProfilePdf(
  input: ProfilePdfInput
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const dateStr = new Date().toISOString().slice(0, 10);

  let page = doc.addPage([612, 792]);
  let y = 750;
  const margin = 50;
  const lineHeight = 14;

  const draw = (text: string, opts?: { bold?: boolean; size?: number }) => {
    const size = opts?.size ?? 11;
    const f = opts?.bold ? bold : font;
    for (const line of wrapLine(text, 90)) {
      if (y < 60) {
        page = doc.addPage([612, 792]);
        y = 750;
      }
      page.drawText(line, { x: margin, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight;
    }
  };

  draw('Curio Learning Profile', { bold: true, size: 18 });
  draw(`Generated ${dateStr}`);
  y -= 8;

  draw('Summary', { bold: true, size: 13 });
  draw(`Topics tracked: ${input.gaps.length + input.mastered.length}`);
  draw(`Knowledge gaps: ${input.gaps.length}`);
  draw(`Mastered topics: ${input.mastered.length}`);
  draw(`Sessions: ${input.sessionCount}`);
  y -= 8;

  if (input.ownerName || input.education) {
    draw('About You', { bold: true, size: 13 });
    if (input.ownerName) draw(`Name: ${input.ownerName}`);
    if (input.education) draw(`Education: ${input.education}`);
    if (input.academicYear) draw(`Year: ${input.academicYear}`);
    if (input.major) draw(`Major: ${input.major}`);
    if (input.goal) draw(`Goal: ${input.goal}`);
    if (input.interests?.length) {
      draw(`Interests: ${input.interests.join(', ')}`);
    }
    y -= 8;
  }

  draw('Knowledge Gaps', { bold: true, size: 13 });
  if (input.gaps.length === 0) {
    draw('None recorded.');
  }
  for (const g of input.gaps) {
    const payload = g.payload as { description?: string };
    draw(`• ${formatTopicDisplayName(g.topic)}${g.subject ? ` (${g.subject})` : ''}`);
    if (payload.description) draw(`  ${payload.description}`);
    draw(`  Last reinforced: ${g.lastReinforcedAt?.slice(0, 10) ?? ''}`);
    y -= 4;
  }
  y -= 8;

  draw('Topics Mastered', { bold: true, size: 13 });
  if (input.mastered.length === 0) {
    draw('None recorded.');
  }
  for (const m of input.mastered) {
    const payload = m.payload as { description?: string; accuracy?: number };
    draw(`• ${formatTopicDisplayName(m.topic)}${m.subject ? ` (${m.subject})` : ''}`);
    if (payload.description) draw(`  ${payload.description}`);
    if (payload.accuracy != null) {
      draw(`  Accuracy: ${Math.round(payload.accuracy * 100)}%`);
    }
    y -= 4;
  }

  return doc.save();
}

export function learningProfileFilename(): string {
  const d = new Date().toISOString().slice(0, 10);
  return `Curio_Learning_Profile_${d}.pdf`;
}
