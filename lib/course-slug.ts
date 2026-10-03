export type CourseMaterial = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  file_path: string | null;
  file_type: string | null;
  search_content?: string;
};

export function getCourseMaterialSlug(material: Pick<CourseMaterial, "id" | "title">) {
  const titleSlug = material.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("id-ID")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "materi";

  return `${titleSlug}-${material.id}`;
}
