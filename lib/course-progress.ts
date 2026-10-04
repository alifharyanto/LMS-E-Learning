const progressStorageKey = "courseup-learning-progress-v1";

export type CourseProgress = {
  completedIds: number[];
  lastOpenedId: number | null;
};

const emptyProgress: CourseProgress = { completedIds: [], lastOpenedId: null };

export function readCourseProgress(): CourseProgress {
  const value = localStorage.getItem(progressStorageKey);
  if (!value) return emptyProgress;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return emptyProgress;
    const completedIds = "completedIds" in parsed && Array.isArray(parsed.completedIds)
      ? parsed.completedIds.filter((id): id is number => Number.isInteger(id))
      : [];
    const lastOpenedId = "lastOpenedId" in parsed && typeof parsed.lastOpenedId === "number" && Number.isInteger(parsed.lastOpenedId)
      ? parsed.lastOpenedId
      : null;
    return { completedIds, lastOpenedId };
  } catch {
    return emptyProgress;
  }
}

export function saveCourseProgress(progress: CourseProgress) {
  localStorage.setItem(progressStorageKey, JSON.stringify(progress));
}
