export interface WorkItem {
  id: string;
  name: string; // company / organization / workplace
  position?: string; // role title (e.g. "Software Engineer")
  isCurrent: boolean;
}

export interface EducationItem {
  id: string;
  name: string; // institution / university / school
  subject?: string; // field of study / major / degree (e.g. "Computer Science")
  isCurrent: boolean;
}

/**
 * Strips any leading "Works at" / "Worked at" / "Works as" prefix to get clean company name
 */
function cleanWorkName(name: string): string {
  return name.replace(/^(works|worked)(\s+(at|as|in))?\s+/i, '').trim();
}

/**
 * Strips any leading "Works as" / "Worked as" / "Former" prefix to get clean position title
 */
function cleanPosition(position: string): string {
  return position.replace(/^(works\s+as|worked\s+as|former|ex-)\s+/i, '').trim();
}

/**
 * Strips any leading "Studies at" / "Studied at" prefix to get clean institution name
 */
function cleanEducationName(name: string): string {
  return name.replace(/^(studies|studied)(\s+(at|in))?\s+/i, '').trim();
}

/**
 * Strips any leading "Studies" / "Studied" / "Majored in" prefix to get clean subject title
 */
function cleanSubject(subject: string): string {
  return subject.replace(/^(studies|studied|majors\s+in|majored\s+in)(\s+in)?\s+/i, '').trim();
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
            const isPast = /^(worked|former|ex-)\s+/i.test(item);
            const cleaned = cleanWorkName(item) || item;
            const atMatch = cleaned.match(/^(.+?)\s+at\s+(.+)$/i);
            if (atMatch) {
              return {
                id: `work-${idx}-${Date.now()}`,
                position: cleanPosition(atMatch[1]),
                name: cleanWorkName(atMatch[2]),
                isCurrent: !isPast,
              };
            }
            return {
              id: `work-${idx}-${Date.now()}`,
              name: cleaned,
              isCurrent: !isPast,
            };
          }
          const rawName = String(item?.name || '').trim();
          const rawPosition = item?.position ? String(item.position).trim() : undefined;
          
          // Auto-detect "position at company" if position not explicitly given
          let pos = rawPosition ? cleanPosition(rawPosition) : undefined;
          let comp = cleanWorkName(rawName) || rawName;
          if (!pos && comp) {
            const atMatch = comp.match(/^(.+?)\s+at\s+(.+)$/i);
            if (atMatch) {
              pos = cleanPosition(atMatch[1]);
              comp = cleanWorkName(atMatch[2]);
            }
          }

          return {
            id: String(item?.id || `work-${idx}-${Date.now()}`),
            name: comp,
            position: pos,
            isCurrent: Boolean(item?.isCurrent ?? true),
          };
        })
        .filter((w) => w.name.length > 0 || (w.position && w.position.length > 0));
    }
  } catch {
    // Legacy plain text single string
  }

  // Fallback: parse single legacy string
  const isPast = /^(worked|former|ex-)\s+/i.test(trimmed);
  const clean = cleanWorkName(trimmed) || trimmed;
  const atMatch = clean.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return [
      {
        id: 'work-legacy',
        position: cleanPosition(atMatch[1]),
        name: cleanWorkName(atMatch[2]),
        isCurrent: !isPast,
      },
    ];
  }
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
            const cleaned = cleanEducationName(item) || item;
            const atMatch = cleaned.match(/^(.+?)\s+at\s+(.+)$/i);
            if (atMatch) {
              return {
                id: `edu-${idx}-${Date.now()}`,
                subject: cleanSubject(atMatch[1]),
                name: cleanEducationName(atMatch[2]),
                isCurrent: isCurrentlyStudying,
              };
            }
            return {
              id: `edu-${idx}-${Date.now()}`,
              name: cleaned,
              isCurrent: isCurrentlyStudying,
            };
          }
          const rawName = String(item?.name || '').trim();
          const rawSubject = item?.subject ? String(item.subject).trim() : undefined;
          
          let subj = rawSubject ? cleanSubject(rawSubject) : undefined;
          let inst = cleanEducationName(rawName) || rawName;
          if (!subj && inst) {
            const atMatch = inst.match(/^(.+?)\s+at\s+(.+)$/i);
            if (atMatch) {
              subj = cleanSubject(atMatch[1]);
              inst = cleanEducationName(atMatch[2]);
            }
          }

          return {
            id: String(item?.id || `edu-${idx}-${Date.now()}`),
            name: inst,
            subject: subj,
            isCurrent: Boolean(item?.isCurrent ?? false),
          };
        })
        .filter((e) => e.name.length > 0 || (e.subject && e.subject.length > 0));
    }
  } catch {
    // Legacy plain text single string
  }

  // Fallback: parse single legacy string
  const isCurrentlyStudying = /^(studies)\s+/i.test(trimmed);
  const clean = cleanEducationName(trimmed) || trimmed;
  const atMatch = clean.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return [
      {
        id: 'edu-legacy',
        subject: cleanSubject(atMatch[1]),
        name: cleanEducationName(atMatch[2]),
        isCurrent: isCurrentlyStudying,
      },
    ];
  }
  return [{ id: 'edu-legacy', name: clean, isCurrent: isCurrentlyStudying }];
}

/**
 * Returns:
 * - "Software Engineer at Google" (current with position & company)
 * - "Former Software Engineer at Google" (past with position & company)
 * - "Works at Google" (current company only)
 * - "Worked at Google" (past company only)
 * - "Works as Software Engineer" (current position only)
 * - "Worked as Software Engineer" (past position only)
 */
export function formatWorkText(item: WorkItem): string {
  const comp = cleanWorkName(item.name || '') || item.name;
  const pos = item.position ? cleanPosition(item.position) : '';

  if (pos && comp) {
    return item.isCurrent ? `${pos} at ${comp}` : `Former ${pos} at ${comp}`;
  }
  if (pos) {
    return item.isCurrent ? `Works as ${pos}` : `Worked as ${pos}`;
  }
  if (comp) {
    return item.isCurrent ? `Works at ${comp}` : `Worked at ${comp}`;
  }
  return '';
}

/**
 * Returns:
 * - "Studies Computer Science at Harvard" (current with subject & school)
 * - "Studied Computer Science at Harvard" (past with subject & school)
 * - "Studies at Harvard" (current school only)
 * - "Studied at Harvard" (past school only)
 * - "Studies Computer Science" (current subject only)
 * - "Studied Computer Science" (past subject only)
 */
export function formatEducationText(item: EducationItem): string {
  const inst = cleanEducationName(item.name || '') || item.name;
  const subj = item.subject ? cleanSubject(item.subject) : '';

  if (subj && inst) {
    return item.isCurrent ? `Studies ${subj} at ${inst}` : `Studied ${subj} at ${inst}`;
  }
  if (subj) {
    return item.isCurrent ? `Studies ${subj}` : `Studied ${subj}`;
  }
  if (inst) {
    return item.isCurrent ? `Studies at ${inst}` : `Studied at ${inst}`;
  }
  return '';
}

export function serializeWorkItems(items: WorkItem[]): string {
  const valid = items
    .map((item) => ({
      name: cleanWorkName(item.name || '') || (item.name ? item.name.trim() : ''),
      position: item.position ? cleanPosition(item.position) : undefined,
      isCurrent: Boolean(item.isCurrent),
    }))
    .filter((item) => item.name.length > 0 || (item.position && item.position.length > 0));
  return valid.length > 0 ? JSON.stringify(valid) : '';
}

export function serializeEducationItems(items: EducationItem[]): string {
  const valid = items
    .map((item) => ({
      name: cleanEducationName(item.name || '') || (item.name ? item.name.trim() : ''),
      subject: item.subject ? cleanSubject(item.subject) : undefined,
      isCurrent: Boolean(item.isCurrent),
    }))
    .filter((item) => item.name.length > 0 || (item.subject && item.subject.length > 0));
  return valid.length > 0 ? JSON.stringify(valid) : '';
}
