/**
 * The product form's variants, worked out from its options. Kept apart from the form so the rules are
 * plain functions: every combination of the options' values is one variant, and a variant whose values
 * survive an edit keeps everything typed into it (and its id, so stock and orders stay attached).
 */

export interface PriceBreakValues {
  min_quantity: number | null;
  unit_price: number | null;
}

export interface VariantValues {
  id: string | null;
  option_values: string[];
  price: number | null;
  compare_at_price: number | null;
  sku: string;
  barcode: string;
  unit_id: string;
  weight_grams: number | null;
  is_active: boolean;
  track_stock: boolean;
  low_stock_at: number | null;
  price_breaks: PriceBreakValues[];
}

export interface OptionValues {
  name: string;
  values: string[];
}

/** One key per combination, ignoring case and spaces at the ends: "red|20 l". */
export const variantKey = (values: string[]) => values.map((v) => v.trim().toLowerCase()).join("|");

/** Every combination of the options' values, in the options' order: Red/10 L, Red/20 L, Blue/10 L... */
export function combinations(options: OptionValues[]): string[][] {
  const usable = options.filter((o) => o.name.trim() && o.values.length > 0);
  return usable.reduce<string[][]>((acc, option) => acc.flatMap((combo) => option.values.map((v) => [...combo, v])), [[]]);
}

export function blankVariant(unitId: string, from?: Partial<VariantValues>): VariantValues {
  return {
    id: null,
    option_values: [],
    price: from?.price ?? null,
    compare_at_price: null,
    sku: "",
    barcode: "",
    unit_id: from?.unit_id || unitId,
    weight_grams: from?.weight_grams ?? null,
    is_active: true,
    track_stock: from?.track_stock ?? true,
    low_stock_at: from?.low_stock_at ?? null,
    price_breaks: [],
  };
}

/**
 * The variants for these options: existing ones carried over by their values, new combinations started
 * from the first variant's price, unit and weight (the usual case: every size costs the same until the
 * vendor says otherwise). A product with no options has exactly one variant.
 */
export function variantsFor(options: OptionValues[], current: VariantValues[], defaultUnitId: string): VariantValues[] {
  const combos = combinations(options);
  const template = current[0];
  if (combos.length === 1 && combos[0].length === 0) {
    return [{ ...(template ?? blankVariant(defaultUnitId)), option_values: [] }];
  }
  const byKey = new Map(current.map((v) => [variantKey(v.option_values), v]));
  return combos.map((values) => {
    const kept = byKey.get(variantKey(values));
    return kept ? { ...kept, option_values: values } : { ...blankVariant(defaultUnitId, template), option_values: values };
  });
}
