import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";

export interface EmbeddingProvider {
  embedText(text: string): Promise<number[]>;
}

const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-2";
const DEFAULT_EMBEDDING_DIM = 768;

@Injectable()
export class AiService implements EmbeddingProvider {
  private embeddingProvider?: EmbeddingProvider;

  constructor(private readonly configService: ConfigService) {}

  async embedText(text: string): Promise<number[]> {
    const normalizedText = text.trim();

    if (!normalizedText) {
      throw new BadRequestException("Cannot embed empty text");
    }

    try {
      return await this.getEmbeddingProvider().embedText(normalizedText);
    } catch (error: unknown) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        `Embedding provider failed: ${getErrorMessage(error)}`
      );
    }
  }

  private getEmbeddingProvider(): EmbeddingProvider {
    this.embeddingProvider ??= new GeminiEmbeddingProvider(this.configService);
    return this.embeddingProvider;
  }
}

class GeminiEmbeddingProvider implements EmbeddingProvider {
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private readonly outputDimensionality: number;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>("GEMINI_API_KEY");

    if (!apiKey) {
      throw new ServiceUnavailableException("GEMINI_API_KEY is required for embeddings");
    }

    this.client = new GoogleGenAI({ apiKey });
    this.model = configService.get<string>("GEMINI_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL);
    this.outputDimensionality = parseEmbeddingDimension(
      configService.get<string>("EMBEDDING_DIM")
    );
  }

  async embedText(text: string): Promise<number[]> {
    const response = await this.client.models.embedContent({
      model: this.model,
      contents: text,
      config: {
        outputDimensionality: this.outputDimensionality
      }
    });

    const values = response.embeddings?.[0]?.values;

    if (!values?.length) {
      throw new ServiceUnavailableException(
        `Gemini embedding response did not include vector values for model ${this.model}`
      );
    }

    if (values.length !== this.outputDimensionality) {
      throw new ServiceUnavailableException(
        `Gemini embedding dimension mismatch: expected ${this.outputDimensionality}, received ${values.length}`
      );
    }

    return values;
  }
}

export function parseEmbeddingDimension(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_EMBEDDING_DIM;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ServiceUnavailableException(`Invalid EMBEDDING_DIM value: ${rawValue}`);
  }

  return parsed;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "unknown error";
}
