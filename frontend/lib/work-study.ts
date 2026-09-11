export interface WorkItem {
  id: string;
  name: string;
  isCurrent: boolean;
}

export interface EducationItem {
  id: string;
  name: string;
  isCurrent: boolean;
}

/**
 * Strips any leading "Works at" / "Worked at" / "Works as" prefix to get clean place/role name
 */
function cleanWorkName(name: string): string {
  return name.replace(/^(works|worked)(\s+(at|as|in))?\s+/i, '').trim();
}

/**
 * Strips any leading "Studies at" / "Studied at" prefix to get clean institution name
 */
function cleanEducationName(name: string): string {
  return name.replace(/^(studies|studied)(\s+(at|in))?\s+/i, '').trim();
}

export function parseWorkItems(raw: string | null | undefined): WorkItem[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, idx): WorkItem => {
          if (typeof item === 'string') {
            const isPast = /^(worked)\s+/i.test(item);
            return {
              id: `work-${idx}-${Date.now()}`,
              name: cleanWorkName(item) || item,
              isCurrent: !isPast,
            };
          }
          const rawName = String(item?.name || '').trim();
          return {
            id: String(item?.id || `work-${idx}-${Date.now()}`),
            name: cleanWorkName(rawName) || rawName,
            isCurrent: Boolean(item?.isCurrent ?? true),
          };
        })
        .filter((w) => w.name.length > 0);
    }
  } catch {
    // Legacy plain text single string
  }

  // Fallback: parse single legacy string
  const isPast = /^(worked)\s+/i.test(trimmed);
  const clean = cleanWorkName(trimmed) || trimmed;
  return [{ id: 'work-legacy', name: clean, isCurrent: !isPast }];
}

export function parseEducationItems(raw: string | null | undefined): EducationItem[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item, idx): EducationItem => {
          if (typeof item === 'string') {
            const isCurrentlyStudying = /^(studies)\s+/i.test(item);
            return {
              id: `edu-${idx}-${Date.now()}`,
              name: cleanEducationName(item) || item,
              isCurrent: isCurrentlyStudying,
            };
          }
          const rawName = String(item?.name || '').trim();
          return {
            id: String(item?.id || `edu-${idx}-${Date.now()}`),
            name: cleanEducationName(rawName) || rawName,
            isCurrent: Boolean(item?.isCurrent ?? false),
          };
        })
        .filter((e) => e.name.length > 0);
    }
  } catch {
    // Legacy plain text single string
  }

  // Fallback: parse single legacy string
  const isCurrentlyStudying = /^(studies)\s+/i.test(trimmed);
  const clean = cleanEducationName(trimmed) || trimmed;
  return [{ id: 'edu-legacy', name: clean, isCurrent: isCurrentlyStudying }];
}

/**
 * Returns "Works at [Name]" if current, or "Worked at [Name]" if past tense
 */
export function formatWorkText(item: WorkItem): string {
  const clean = cleanWorkName(item.name) || item.name;
  return item.isCurrent ? `Works at ${clean}` : `Worked at ${clean}`;
}

/**
 * Returns "Studies at [Name]" if current, or "Studied at [Name]" if past tense
 */
export function formatEducationText(item: EducationItem): string {
  const clean = cleanEducationName(item.name) || item.name;
  return item.isCurrent ? `Studies at ${clean}` : `Studied at ${clean}`;
}

export function serializeWorkItems(items: WorkItem[]): string {
  const valid = items
    .map((item) => ({
      name: cleanWorkName(item.name) || item.name.trim(),
      isCurrent: Boolean(item.isCurrent),
    }))
    .filter((item) => item.name.length > 0);
  return valid.length > 0 ? JSON.stringify(valid) : '';
}

export function serializeEducationItems(items: EducationItem[]): string {
  const valid = items
    .map((item) => ({
      name: cleanEducationName(item.name) || item.name.trim(),
      isCurrent: Boolean(item.isCurrent),
    }))
    .filter((item) => item.name.length > 0);
  return valid.length > 0 ? JSON.stringify(valid) : '';
}
