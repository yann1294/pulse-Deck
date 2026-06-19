import { BadRequestException, Injectable } from "@nestjs/common";
import { extname } from "node:path";
import { PDFParse } from "pdf-parse";
import { normalizeWhitespace } from "./chunker.service";

export type SupportedDocumentExtension = ".txt" | ".md" | ".pdf";

export interface ParseDocumentInput {
  fileName: string;
  buffer: Buffer;
}

export interface ParsedDocument {
  fileName: string;
  extension: SupportedDocumentExtension;
  text: string;
}

const SUPPORTED_EXTENSIONS = new Set<SupportedDocumentExtension>([".txt", ".md", ".pdf"]);

export function getSupportedDocumentExtension(fileName: string): SupportedDocumentExtension {
  const extension = extname(fileName).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension as SupportedDocumentExtension)) {
    throw new BadRequestException("Unsupported knowledge-base file type. Use .txt, .md, or .pdf.");
  }

  return extension as SupportedDocumentExtension;
}

export function parsePlainTextBuffer(buffer: Buffer): string {
  return normalizeWhitespace(buffer.toString("utf8"));
}

@Injectable()
export class DocumentParserService {
  async parseDocument(input: ParseDocumentInput): Promise<ParsedDocument> {
    const extension = getSupportedDocumentExtension(input.fileName);
    const text =
      extension === ".pdf"
        ? await this.parsePdf(input.buffer)
        : parsePlainTextBuffer(input.buffer);

    if (!text) {
      throw new BadRequestException("Document did not contain extractable text");
    }

    return {
      fileName: input.fileName,
      extension,
      text
    };
  }

  private async parsePdf(buffer: Buffer): Promise<string> {
    const parser = new PDFParse({ data: buffer });

    try {
      const result = await parser.getText();
      return normalizeWhitespace(result.text);
    } finally {
      await parser.destroy();
    }
  }
}
