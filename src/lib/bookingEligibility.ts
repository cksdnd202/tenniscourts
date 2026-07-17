export type PriorityEligibilityLabel = "구민" | "시민" | "주민";

export function getPriorityEligibilityLabel(
  value: string | null | undefined
): PriorityEligibilityLabel | null {
  if (value === "resident") return "구민";
  if (value === "citizen") return "시민";
  if (value === "inhabitant") return "주민";
  return null;
}

export function hasPriorityEligibility(value: string | null | undefined) {
  return getPriorityEligibilityLabel(value) !== null;
}
