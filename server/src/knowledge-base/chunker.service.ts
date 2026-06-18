import { BadRequestException, Injectable } from "@nestjs/common";

export interface TextChunk {
  chunkIndex: number;
  content: string;
}

export interface ChunkTextOptions {
  maxChunkSize?: number;
  overlapSize?: number;
}

const DEFAULT_MAX_CHUNK_SIZE = 900;
const DEFAULT_OVERLAP_SIZE = 125;
const MIN_CHUNK_SIZE = 700;
const MAX_CHUNK_SIZE = 1000;
const MIN_OVERLAP_SIZE = 100;
const MAX_OVERLAP_SIZE = 150;

export function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chunkText(input: string, options: ChunkTextOptions = {}): TextChunk[] {
  const maxChunkSize = options.maxChunkSize ?? DEFAULT_MAX_CHUNK_SIZE;
  const overlapSize = options.overlapSize ?? DEFAULT_OVERLAP_SIZE;

  validateChunkOptions(maxChunkSize, overlapSize);

  const text = normalizeWhitespace(input);

  if (!text) {
    return [];
  }

  if (text.length <= maxChunkSize) {
    return [{ chunkIndex: 0, content: text }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;

  while (start < text.length) {
    const hardEnd = Math.min(start + maxChunkSize, text.length);
    const end = findChunkEnd(text, start, hardEnd);
    const content = text.slice(start, end).trim();

    if (content) {
      chunks.push({
        chunkIndex: chunks.length,
        content
      });
    }

    if (end >= text.length) {
      break;
    }

    start = Math.max(0, end - overlapSize);
    start = skipLeadingWhitespace(text, start);
  }

  return chunks;
}

function validateChunkOptions(maxChunkSize: number, overlapSize: number): void {
  if (maxChunkSize < MIN_CHUNK_SIZE || maxChunkSize > MAX_CHUNK_SIZE) {
    throw new BadRequestException(
      `maxChunkSize must be between ${MIN_CHUNK_SIZE} and ${MAX_CHUNK_SIZE} characters`
    );
  }

  if (overlapSize < MIN_OVERLAP_SIZE || overlapSize > MAX_OVERLAP_SIZE) {
    throw new BadRequestException(
      `overlapSize must be between ${MIN_OVERLAP_SIZE} and ${MAX_OVERLAP_SIZE} characters`
    );
  }

  if (overlapSize >= maxChunkSize) {
    throw new BadRequestException("overlapSize must be smaller than maxChunkSize");
  }
}

function findChunkEnd(text: string, start: number, hardEnd: number): number {
  if (hardEnd >= text.length) {
    return text.length;
  }

  const minEnd = Math.min(start + MIN_CHUNK_SIZE, hardEnd);
  const candidate = text.slice(minEnd, hardEnd);
  const paragraphBreak = candidate.lastIndexOf("\n\n");

  if (paragraphBreak >= 0) {
    return minEnd + paragraphBreak + 2;
  }

  const sentenceBreak = Math.max(
    candidate.lastIndexOf(". "),
    candidate.lastIndexOf("! "),
    candidate.lastIndexOf("? ")
  );

  if (sentenceBreak >= 0) {
    return minEnd + sentenceBreak + 2;
  }

  const whitespaceBreak = candidate.lastIndexOf(" ");

  if (whitespaceBreak >= 0) {
    return minEnd + whitespaceBreak + 1;
  }

  return hardEnd;
}

function skipLeadingWhitespace(text: string, index: number): number {
  let cursor = index;

  while (cursor < text.length && /\s/.test(text[cursor] ?? "")) {
    cursor += 1;
  }

  return cursor;
}

@Injectable()
export class ChunkerService {
  chunkText(input: string, options?: ChunkTextOptions): TextChunk[] {
    return chunkText(input, options);
  }

  normalizeWhitespace(input: string): string {
    return normalizeWhitespace(input);
  }
}
