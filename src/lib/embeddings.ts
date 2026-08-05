import { prisma } from "@/lib/prisma";

/**
 * Cosine Similarity calculation between two numerical vector arrays
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Semantic Vector Generator (Deterministic 64-dimensional float vector representation)
 */
export function generateEmbeddingVector(text: string): number[] {
  const DIMENSIONS = 64;
  const vector = new Array(DIMENSIONS).fill(0);
  const normalized = text.toLowerCase().trim();

  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const index = (charCode * (i + 1)) % DIMENSIONS;
    vector[index] += Math.sin(charCode + i) * 0.5 + 0.5;
  }

  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map((val) => val / magnitude);
}

export interface SemanticSearchResult {
  id: string;
  documentId: string;
  contentChunk: string;
  similarityScore: number;
  metadata: any;
  document: {
    documentType: string;
    fileUrl: string;
    uploadedAt: Date;
  };
}

/**
 * Perform semantic search across document embeddings scoped to a single user.
 */
export async function searchDocumentEmbeddings(
  query: string,
  topK: number = 5,
  userId?: string
): Promise<SemanticSearchResult[]> {
  const queryVector = generateEmbeddingVector(query);

  // Scope to the user's own accounts so no cross-user data leaks through search.
  let documentIdFilter: string[] | undefined;
  if (userId) {
    const [accountIds, incomeIds] = await Promise.all([
      prisma.account.findMany({ where: { userId }, select: { id: true } }).then((rows) => rows.map((r) => r.id)),
      prisma.income.findMany({ where: { userId }, select: { id: true } }).then((rows) => rows.map((r) => r.id)),
    ]);
    const userDocs = await prisma.document.findMany({
      where: { relatedEntityId: { in: [...accountIds, ...incomeIds] } },
      select: { id: true },
    });
    documentIdFilter = userDocs.map((d) => d.id);
    if (documentIdFilter.length === 0) return [];
  }

  const embeddings = await prisma.documentEmbedding.findMany({
    where: documentIdFilter ? { documentId: { in: documentIdFilter } } : undefined,
    include: {
      document: {
        select: {
          documentType: true,
          fileUrl: true,
          uploadedAt: true,
        },
      },
    },
  });

  const ranked = embeddings
    .map((emb) => {
      const vec = emb.embeddingJson as number[];
      const score = cosineSimilarity(queryVector, vec);
      return {
        id: emb.id,
        documentId: emb.documentId,
        contentChunk: emb.contentChunk,
        similarityScore: Math.round(score * 1000) / 1000,
        metadata: emb.metadataJson,
        document: emb.document,
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, topK);

  return ranked;
}
