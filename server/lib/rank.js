// Deterministic ranking: the LLM only produces intent; picks always come from the real catalog.
export function rank(catalog, intent = {}, rejected = [], limit = 3) {
  const scored = catalog
    .filter((t) => !rejected.includes(t.id))
    .map((t) => {
      if (intent.maxMinutes && t.minutes > intent.maxMinutes) return { t, s: -99, why: [] };
      let s = 0;
      const why = [];
      if (intent.audience) {
        if (t.audience.includes(intent.audience)) { s += 3; why.push(`works for ${intent.audience} viewing`); }
        else if (intent.audience === 'family' || intent.audience === 'kids') s -= 4;
      }
      if (intent.mood && t.moods.includes(intent.mood)) { s += 3; why.push(`feels ${intent.mood}`); }
      for (const g of intent.genres || []) if (t.genres.includes(g)) { s += 2; why.push(g); }
      for (const a of intent.avoid || []) if (t.moods.includes(a) || t.genres.includes(a)) s -= 6;
      if (intent.maxMinutes) why.push(`runs ${t.minutes} min`);
      return { t, s, why };
    })
    .filter((x) => x.s > -50)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map(({ t, why }) => ({
    id: t.id,
    why: why.length ? `Picked because it ${why.join(', ')}.` : t.description,
  }));
}
