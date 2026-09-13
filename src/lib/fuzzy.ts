export function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i += 1) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      curr.push(Math.min(curr[j] + 1, prev[j + 1] + 1, prev[j] + cost));
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j] ?? 0;
  }
  return prev[b.length] ?? b.length;
}

export function nameSimilarity(query: string, candidate: string) {
  const q = normalizeName(query);
  const c = normalizeName(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1;
  if (c.startsWith(q)) return 0.94;
  if (c.includes(q)) return 0.82;

  const queryTokens = q.split(" ").filter(Boolean);
  const candidateTokens = c.split(" ").filter(Boolean);
  if (queryTokens.length) {
    let hits = 0;
    for (const token of queryTokens) {
      const matched = candidateTokens.some((part) => {
        if (part.startsWith(token) || token.startsWith(part)) return true;
        const max = Math.max(token.length, part.length);
        const allowed = token.length <= 4 ? 1 : Math.max(1, Math.floor(token.length / 4));
        return levenshtein(token, part) <= allowed && 1 - levenshtein(token, part) / max >= 0.6;
      });
      if (matched) hits += 1;
    }
    const tokenScore = hits / queryTokens.length;
    if (tokenScore >= 0.5) return Math.max(0.58, tokenScore * 0.9);
  }

  const distance = levenshtein(q, c);
  return Math.max(0, 1 - distance / Math.max(q.length, c.length));
}

export function rankByName<T>(items: T[], query: string, getName: (item: T) => string, minScore = 0.45) {
  const value = query.trim();
  if (!value) return items.map((item) => ({ item, score: 1 }));
  return items
    .map((item) => ({ item, score: nameSimilarity(value, getName(item)) }))
    .filter((entry) => entry.score >= minScore)
    .sort((a, b) => b.score - a.score || getName(a.item).localeCompare(getName(b.item)));
}

export function bestNameMatch<T>(items: T[], query: string, getName: (item: T) => string) {
  const ranked = rankByName(items, query, getName, 0.52);
  const top = ranked[0];
  if (!top) return null;
  const second = ranked[1];
  if (top.score >= 0.92) return top.item;
  if (top.score >= 0.62 && (!second || top.score - second.score >= 0.08)) return top.item;
  return null;
}
