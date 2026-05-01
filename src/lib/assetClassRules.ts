import type { Asset, AssetClassDef } from '../store/db';

export function normalizeCountryKey(country: string) {
  return String(country || '').trim().toLowerCase();
}

export function normalizeAssetClassKey(name: string) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

export function normalizeAssetClassDisplayName(name: string) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

export function buildCountryScopedClassKey(country: string, name: string) {
  return `${normalizeCountryKey(country)}:${normalizeAssetClassKey(name)}`;
}

// Optimal string alignment distance (Damerau-Levenshtein with adjacent transpositions).
export function damerauLevenshteinDistance(aRaw: string, bRaw: string) {
  const a = String(aRaw);
  const b = String(bRaw);
  const aLen = a.length;
  const bLen = b.length;

  if (a === b) return 0;
  if (!aLen) return bLen;
  if (!bLen) return aLen;

  const dp: number[][] = Array.from({ length: aLen + 1 }, () => new Array<number>(bLen + 1).fill(0));
  for (let i = 0; i <= aLen; i++) dp[i][0] = i;
  for (let j = 0; j <= bLen; j++) dp[0][j] = j;

  for (let i = 1; i <= aLen; i++) {
    for (let j = 1; j <= bLen; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );

      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1); // transposition
      }
    }
  }

  return dp[aLen][bLen];
}

export function findMinorTypoClassMatch({
  inputName,
  candidates,
}: {
  inputName: string;
  candidates: AssetClassDef[];
}): AssetClassDef | null {
  const inputKey = normalizeAssetClassKey(inputName);
  if (!inputKey) return null;
  if (inputKey.length < 3) return null;

  const threshold = inputKey.length <= 7 ? 1 : 2;
  const inputPrefix = inputKey.slice(0, inputKey.length >= 6 ? 2 : 1);

  let best: { candidate: AssetClassDef; distance: number } | null = null;
  let tied = false;

  for (const candidate of candidates) {
    const candidateKey = normalizeAssetClassKey(candidate.name);
    if (!candidateKey) continue;
    if (!candidateKey.startsWith(inputPrefix)) continue;

    const distance = damerauLevenshteinDistance(inputKey, candidateKey);
    if (distance === 0) {
      return candidate;
    }
    if (distance > threshold) continue;

    if (!best || distance < best.distance) {
      best = { candidate, distance };
      tied = false;
    } else if (best && distance === best.distance) {
      tied = true;
    }
  }

  if (!best || tied) return null;
  return best.candidate;
}

export function dedupeAssetClassesByCountryKey({
  customAssetClasses,
}: {
  customAssetClasses: AssetClassDef[];
}): AssetClassDef[] {
  const byKey = new Map<string, AssetClassDef>();

  for (const cls of customAssetClasses) {
    const country = normalizeCountryKey(cls.country);
    const name = normalizeAssetClassDisplayName(cls.name);
    const key = buildCountryScopedClassKey(country, name);
    if (!key.endsWith(':')) {
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, { ...cls, country: cls.country, name });
      } else {
        // Prefer keeping an image if only one has it.
        const mergedImage = existing.image || cls.image;
        byKey.set(key, { ...existing, image: mergedImage });
      }
    }
  }

  return Array.from(byKey.values());
}

export function reconcileAssetClassesForAssets({
  assets,
  systemAssetClasses,
  customAssetClasses,
}: {
  assets: Asset[];
  systemAssetClasses: AssetClassDef[];
  customAssetClasses: AssetClassDef[];
}): { assets: Asset[]; customAssetClasses: AssetClassDef[] } {
  const dedupedCustom = dedupeAssetClassesByCountryKey({ customAssetClasses });
  const baseAll = [...systemAssetClasses, ...dedupedCustom];

  const classByKey = new Map<string, AssetClassDef>();
  const countryCandidates = new Map<string, AssetClassDef[]>();
  for (const cls of baseAll) {
    const key = buildCountryScopedClassKey(cls.country, cls.name);
    classByKey.set(key, cls);
    const countryKey = normalizeCountryKey(cls.country);
    const list = countryCandidates.get(countryKey) || [];
    list.push(cls);
    countryCandidates.set(countryKey, list);
  }

  const created: AssetClassDef[] = [];

  const nextAssets = assets.map((asset) => {
    const country = asset.country;
    const rawName = normalizeAssetClassDisplayName(asset.assetClass);
    const name = rawName || 'Other';

    const exactKey = buildCountryScopedClassKey(country, name);
    const exact = classByKey.get(exactKey);
    if (exact) {
      return exact.name === asset.assetClass ? asset : { ...asset, assetClass: exact.name };
    }

    const candidates = countryCandidates.get(normalizeCountryKey(country)) || [];
    const fuzzy = findMinorTypoClassMatch({ inputName: name, candidates });
    if (fuzzy) {
      return { ...asset, assetClass: fuzzy.name };
    }

    const createKey = buildCountryScopedClassKey(country, name);
    const existingAfterNormalize = classByKey.get(createKey);
    if (existingAfterNormalize) {
      return { ...asset, assetClass: existingAfterNormalize.name };
    }

    const newClass: AssetClassDef = {
      id: crypto.randomUUID(),
      country,
      name,
    };
    created.push(newClass);
    classByKey.set(createKey, newClass);
    return { ...asset, assetClass: name };
  });

  const usageCounts = nextAssets.reduce((acc, asset) => {
    const key = buildCountryScopedClassKey(asset.country, asset.assetClass);
    acc.set(key, (acc.get(key) || 0) + 1);
    return acc;
  }, new Map<string, number>());

  const isMinorTypoPair = (leftName: string, rightName: string) => {
    const leftKey = normalizeAssetClassKey(leftName);
    const rightKey = normalizeAssetClassKey(rightName);
    if (!leftKey || !rightKey) return false;
    if (leftKey.length < 3 || rightKey.length < 3) return false;
    const maxLen = Math.max(leftKey.length, rightKey.length);
    const threshold = maxLen <= 7 ? 1 : 2;
    const prefixLen = maxLen >= 6 ? 2 : 1;
    if (leftKey.slice(0, prefixLen) !== rightKey.slice(0, prefixLen)) return false;
    const distance = damerauLevenshteinDistance(leftKey, rightKey);
    return distance > 0 && distance <= threshold;
  };

  const preExistingKeys = new Set(baseAll.map((cls) => buildCountryScopedClassKey(cls.country, cls.name)));
  const allCustomAfterCreate = [...dedupedCustom, ...created];

  const mergedNameByKey = new Map<string, string>();
  for (const source of allCustomAfterCreate) {
    const sourceKey = buildCountryScopedClassKey(source.country, source.name);
    if (mergedNameByKey.has(sourceKey)) continue;

    const candidates = [...baseAll, ...created]
      .filter((candidate) => candidate.id !== source.id)
      .filter((candidate) => normalizeCountryKey(candidate.country) === normalizeCountryKey(source.country))
      .filter((candidate) => isMinorTypoPair(source.name, candidate.name));

    const sourceCount = usageCounts.get(sourceKey) || 0;
    const best = candidates
      .map((candidate) => ({
        candidate,
        candidateKey: buildCountryScopedClassKey(candidate.country, candidate.name),
        candidateCount: usageCounts.get(buildCountryScopedClassKey(candidate.country, candidate.name)) || 0,
        isSystem: systemAssetClasses.some((system) => system.id === candidate.id),
        isPreExisting: preExistingKeys.has(buildCountryScopedClassKey(candidate.country, candidate.name)),
      }))
      .sort((a, b) => {
        if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
        if (a.isPreExisting !== b.isPreExisting) return a.isPreExisting ? -1 : 1;
        if (a.candidateCount !== b.candidateCount) return b.candidateCount - a.candidateCount;
        return a.candidate.name.localeCompare(b.candidate.name);
      })[0];

    if (!best) continue;

    // Merge into system/pre-existing classes, or into higher-confidence spellings.
    const shouldMerge = best.isSystem || best.isPreExisting || best.candidateCount > sourceCount;
    if (shouldMerge) {
      mergedNameByKey.set(sourceKey, best.candidate.name);
    }
  }

  const consolidatedAssets = mergedNameByKey.size === 0
    ? nextAssets
    : nextAssets.map((asset) => {
        const key = buildCountryScopedClassKey(asset.country, asset.assetClass);
        const mergedName = mergedNameByKey.get(key);
        return mergedName ? { ...asset, assetClass: mergedName } : asset;
      });

  const droppedKeys = new Set(Array.from(mergedNameByKey.keys()));
  const consolidatedCustomClasses = allCustomAfterCreate.filter((cls) => !droppedKeys.has(buildCountryScopedClassKey(cls.country, cls.name)));

  return {
    assets: consolidatedAssets,
    customAssetClasses: consolidatedCustomClasses,
  };
}
