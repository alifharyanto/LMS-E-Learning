import CourseMaterialPage from "@/components/courses/course-material-page";

export default async function KursusDetailPage({ params }: PageProps<"/kursus/[slug]">) {
  const { slug } = await params;
  return <CourseMaterialPage slug={slug} />;
}
