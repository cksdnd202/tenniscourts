import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Bound URL size, paginate each ID batch, and never turn an empty scope into a full scan.
export async function notificationRowsByIds<T>(
  table: string,
  select: string,
  field: string,
  ids: string[],
  filters: Array<[string, string | boolean]> = [],
) {
  const output: T[] = [];
  const uniqueIds = [...new Set(ids)];
  for (let index = 0; index < uniqueIds.length; index += 100) {
    const batch = uniqueIds.slice(index, index + 100);
    for (let from = 0; ; from += 500) {
      let query = getSupabaseAdmin().from(table).select(select)
        .in(field, batch).order("id").range(from, from + 499);
      for (const [name, value] of filters) query = query.eq(name, value);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      output.push(...((data ?? []) as unknown as T[]));
      if ((data?.length ?? 0) < 500) break;
    }
  }
  return output;
}
