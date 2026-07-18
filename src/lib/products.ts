import type { ProductCategory } from "@/lib/supabase/types";

const CATEGORY_KEYWORDS: [RegExp, ProductCategory][] = [
  [/vehicle|car|truck|motorcycle|automotive|tire/i, "Vehicle"],
  [/tool|drill|saw|hardware|power equipment/i, "Tool"],
  [
    /appliance|refrigerator|fridge|washer|dryer|dishwasher|oven|microwave|vacuum/i,
    "Appliance",
  ],
  [
    /electronics|computer|laptop|phone|tv|television|camera|audio|tablet|monitor/i,
    "Electronics",
  ],
];

export function guessCategory(freeText: string | null | undefined): ProductCategory {
  if (!freeText) return "Other";
  for (const [pattern, category] of CATEGORY_KEYWORDS) {
    if (pattern.test(freeText)) return category;
  }
  return "Other";
}
