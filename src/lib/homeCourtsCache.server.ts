import { revalidatePath, revalidateTag } from "next/cache";

export const HOME_COURTS_CACHE_TAG = "home-courts";
export const MAP_COURTS_CACHE_TAG = "map-courts";

export function invalidateMapCourtsCache() {
  revalidateTag(MAP_COURTS_CACHE_TAG, { expire: 0 });
}
export const HOME_COURTS_REVALIDATE_SECONDS = 60 * 60;

export function invalidateHomeCourtsCache() {
  invalidateMapCourtsCache();
  revalidateTag(HOME_COURTS_CACHE_TAG, { expire: 0 });
  revalidatePath("/");
  revalidatePath("/tennis");
  revalidatePath("/badminton");
}
