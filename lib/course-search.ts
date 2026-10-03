import type { CourseMaterial } from "@/lib/course-slug";

type SearchField = {
  termFrequencies: Map<string, number>;
  length: number;
  weight: number;
  averageLength: number;
};

type IndexedMaterial = {
  material: CourseMaterial;
  fields: SearchField[];
  uniqueTerms: Set<string>;
  documentLength: number;
  index: number;
};

export type CourseSearchIndex = {
  documents: IndexedMaterial[];
  documentFrequency: Map<string, number>;
  relatedTerms: Map<string, Map<string, number>>;
};

function normalizeSearchText(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .match(/[\p{L}\p{N}]+/gu) ?? [];
}

function editDistance(first: string, second: string): number {
  let previousRow = Array.from({ length: second.length + 1 }, (_, index) => index);

  for (let row = 1; row <= first.length; row += 1) {
    const currentRow = [row];
    for (let column = 1; column <= second.length; column += 1) {
      const substitutionCost = first[row - 1] === second[column - 1] ? 0 : 1;
      currentRow[column] = Math.min(
        previousRow[column] + 1,
        currentRow[column - 1] + 1,
        previousRow[column - 1] + substitutionCost,
      );
    }
    previousRow = currentRow;
  }

  return previousRow[second.length];
}

function buildRelatedTerms(documents: IndexedMaterial[]): Map<string, Map<string, number>> {
  const cooccurrences = new Map<string, Map<string, number>>();
  const frequencies = new Map<string, number>();

  for (const document of documents) {
    const paragraphs = [
      document.material.title,
      document.material.category,
      document.material.description ?? "",
      ...(document.material.search_content?.split(/\n{2,}/u) ?? []),
    ];
    for (const paragraph of paragraphs) {
      const terms = normalizeSearchText(paragraph);
      for (let position = 0; position < terms.length; position += 1) {
        const term = terms[position];
        if (!term) continue;
        frequencies.set(term, (frequencies.get(term) ?? 0) + 1);
        let related = cooccurrences.get(term);
        if (!related) {
          related = new Map<string, number>();
          cooccurrences.set(term, related);
        }
        for (let offset = 1; offset <= 6 && position + offset < terms.length; offset += 1) {
          const other = terms[position + offset];
          if (!other || other === term) continue;
          related.set(other, (related.get(other) ?? 0) + 1);
          let reverseRelated = cooccurrences.get(other);
          if (!reverseRelated) {
            reverseRelated = new Map<string, number>();
            cooccurrences.set(other, reverseRelated);
          }
          reverseRelated.set(term, (reverseRelated.get(term) ?? 0) + 1);
        }
      }
    }
  }

  const relatedTerms = new Map<string, Map<string, number>>();
  for (const [term, related] of cooccurrences) {
    const termFrequency = frequencies.get(term) ?? 1;
    const scoredTerms = [...related]
      .filter(([candidate]) => candidate.length > 2)
      .map(([candidate, count]) => {
        const candidateFrequency = frequencies.get(candidate) ?? 1;
        return [candidate, count / Math.sqrt(termFrequency * candidateFrequency)] as const;
      })
      .filter(([, relevance]) => relevance >= 0.04)
      .sort((first, second) => second[1] - first[1])
    relatedTerms.set(term, new Map(scoredTerms));
  }

  return relatedTerms;
}

export function createCourseSearchIndex(materials: CourseMaterial[]): CourseSearchIndex {
  const documents: IndexedMaterial[] = materials.map((material, index) => {
    const fields = [
      { text: material.title, weight: 6 },
      { text: material.category, weight: 4 },
      { text: material.description ?? "", weight: 3 },
      { text: material.search_content ?? "", weight: 1 },
    ].map(({ text, weight }) => {
      const terms = normalizeSearchText(text);
      const termFrequencies = new Map<string, number>();
      for (const term of terms) {
        termFrequencies.set(term, (termFrequencies.get(term) ?? 0) + 1);
      }
      return { termFrequencies, length: terms.length, weight, averageLength: 1 };
    });
    const termFrequencies = new Map<string, number>();

    for (const field of fields) {
      for (const term of field.termFrequencies.keys()) {
        termFrequencies.set(term, (termFrequencies.get(term) ?? 0) + 1);
      }
    }

    return {
      material,
      fields,
      uniqueTerms: new Set(termFrequencies.keys()),
      documentLength: fields.reduce((length, field) => length + field.length, 0),
      index,
    };
  });

  const documentFrequency = new Map<string, number>();
  for (const document of documents) {
    for (const term of document.uniqueTerms) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const relatedTerms = buildRelatedTerms(documents);
  const averageFieldLengths = new Map<number, number>();
  for (const weight of [6, 4, 3, 1]) {
    averageFieldLengths.set(
      weight,
      documents.length
        ? documents.reduce((total, document) => {
          return total + (document.fields.find((field) => field.weight === weight)?.length ?? 0);
        }, 0) / documents.length
        : 0,
    );
  }

  for (const field of documents.flatMap((document) => document.fields)) {
    field.averageLength = averageFieldLengths.get(field.weight) ?? 0;
  }

  return { documents, documentFrequency, relatedTerms };
}

function termMatchScore(queryTerm: string, candidate: string): number {
  if (candidate === queryTerm) return 1;
  if (
    queryTerm.length >= 3 &&
    (candidate.startsWith(queryTerm) || candidate.includes(queryTerm))
  ) {
    return 0.8;
  }

  const longestLength = Math.max(queryTerm.length, candidate.length);
  if (longestLength < 4) return 0;
  const allowedDistance = longestLength >= 8 ? 2 : 1;
  return editDistance(queryTerm, candidate) <= allowedDistance ? 0.6 : 0;
}

function scoreTerm(
  document: IndexedMaterial,
  term: string,
  termWeight: number,
  index: CourseSearchIndex,
): number {
  const k1 = 1.2;
  const b = 0.75;
  let score = 0;

  for (const field of document.fields) {
    const matchingTerms = new Map<string, number>();
    for (const [candidate, count] of field.termFrequencies) {
      const match = termMatchScore(term, candidate);
      if (match) {
        matchingTerms.set(
          candidate,
          (matchingTerms.get(candidate) ?? 0) + match * count,
        );
      }
    }

    const lengthNormalization = field.averageLength
      ? 1 - b + b * field.length / field.averageLength
      : 1;
    for (const [candidate, frequency] of matchingTerms) {
      const documentFrequency = index.documentFrequency.get(candidate) ?? 0;
      if (!documentFrequency) continue;
      const inverseDocumentFrequency = Math.log(
        1 + (index.documents.length - documentFrequency + 0.5) / (documentFrequency + 0.5),
      );
      score += field.weight * termWeight * inverseDocumentFrequency *
        ((frequency * (k1 + 1)) / (frequency + k1 * lengthNormalization));
    }
  }

  return score;
}

export function searchCourseMaterials(index: CourseSearchIndex, search: string): CourseMaterial[] {
  const queryTerms = [...new Set(normalizeSearchText(search))];
  if (queryTerms.length === 0) return index.documents.map(({ material }) => material);
  const weightedTerms = new Map<string, number>(queryTerms.map((term) => [term, 1]));

  for (const queryTerm of queryTerms) {
    const exactRelated = index.relatedTerms.get(queryTerm);
    const sources = exactRelated
      ? [[queryTerm, exactRelated] as const]
      : [...index.relatedTerms].filter(([sourceTerm]) => termMatchScore(queryTerm, sourceTerm) > 0);
    for (const [sourceTerm, related] of sources) {
      const sourceMatch = termMatchScore(queryTerm, sourceTerm);
      for (const [relatedTerm, relevance] of related) {
        const weight = Math.min(relevance * sourceMatch, 0.45);
        weightedTerms.set(relatedTerm, Math.max(weightedTerms.get(relatedTerm) ?? 0, weight));
      }
    }
  }

  return index.documents
    .map((document) => {
      let score = 0;
      for (const [term, weight] of weightedTerms) {
        score += scoreTerm(document, term, weight, index);
      }

      return { material: document.material, score, index: document.index };
    })
    .filter(({ score }) => score > 0)
    .sort((first, second) => second.score - first.score || first.index - second.index)
    .map(({ material }) => material);
}
