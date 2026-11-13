import type { UserProfile } from '@/lib/types/user-profile';

const LIFESTAGE_LABELS: Record<string, string> = {
  'high-school': 'High School Student',
  college: 'College / Undergraduate',
  graduate: 'Graduate / PhD',
  teacher: 'Teacher',
  professional: 'Lifelong Learner / Professional',
  other: 'Something Else',
};

const LIFESTAGE_SHORT_LABELS: Record<string, string> = {
  'high-school': 'High School',
  college: 'Undergraduate',
  graduate: 'Graduate',
  teacher: 'Teacher',
  professional: 'Professional',
  other: 'Other',
};

const LEGACY_LIFESTAGE_ALIASES: Record<string, string> = {
  'high school student': 'high-school',
  'high school': 'high-school',
  undergraduate: 'college',
  'college / undergraduate': 'college',
  'graduate / phd': 'graduate',
  'post grad / masters': 'graduate',
  'i teach': 'teacher',
  "i'm working": 'professional',
  "i'm different": 'other',
};

const INTENT_LABELS: Record<string, string> = {
  'exam-prep': 'Prep for an upcoming exam',
  'summarize-video': 'Summarize a video',
  'summarize-test': 'Summarize a test / paper',
  'notes-to-tools': 'Turn my notes into study tools',
  'dive-deeper': 'Dive deeper into a topic',
  'something-else': 'Something Else',
  'ace my exams': 'Ace my exams',
  'understand a tough topic': 'Understand a tough topic',
  'finish homework': 'Finish homework',
  'organise my notes': 'Organise my notes',
  'learn something new': 'Learn something new',
};

export const LIFESTAGE_OPTIONS = Object.entries(LIFESTAGE_LABELS).map(
  ([value, label]) => ({ value, label }),
);

const YEAR_LABELS: Record<string, string> = {
  'year 1': 'Freshman (1st year)',
  'year 2': 'Sophomore (2nd year)',
  'year 3': 'Junior (3rd year)',
  'year 4': 'Senior (4th year)',
  freshman: 'Freshman (1st year)',
  sophomore: 'Sophomore (2nd year)',
  junior: 'Junior (3rd year)',
  senior: 'Senior (4th year)',
  '1st year': 'Freshman (1st year)',
  '2nd year': 'Sophomore (2nd year)',
  '3rd year': 'Junior (3rd year)',
  '4th year': 'Senior (4th year)',
};

const YEAR_PATTERN =
  /\b(year\s*\d+|freshman|sophomore|junior|senior|\d+(?:st|nd|rd|th)\s+year)\b/i;

export type DisplayUserProfile = {
  educationLevel: string;
  educationLevelFull: string;
  lifestageSlug: string | null;
  year: string;
  major: string;
  mainGoal: string;
  mainGoals: string[];
  curiousAbout: string[];
};

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveLifestageSlug(
  lifestage?: string | null,
  userDescription?: string | null,
): string | null {
  if (lifestage && LIFESTAGE_LABELS[lifestage]) {
    return lifestage;
  }

  const candidates = [lifestage, userDescription].filter(Boolean) as string[];
  for (const candidate of candidates) {
    const key = normalizeKey(candidate);
    if (LIFESTAGE_LABELS[key]) {
      return key;
    }
    if (LEGACY_LIFESTAGE_ALIASES[key]) {
      return LEGACY_LIFESTAGE_ALIASES[key];
    }
    for (const [slug, label] of Object.entries(LIFESTAGE_LABELS)) {
      if (normalizeKey(label) === key) {
        return slug;
      }
    }
  }

  return null;
}

export function formatEducationLevelFull(
  lifestage?: string | null,
  userDescription?: string | null,
): string {
  const slug = resolveLifestageSlug(lifestage, userDescription);
  if (slug) {
    return LIFESTAGE_LABELS[slug];
  }

  const fallback = userDescription?.trim() || lifestage?.trim();
  if (!fallback) {
    return 'Not set';
  }

  if (fallback.includes('-')) {
    return fallback
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  return fallback;
}

export function formatEducationLevelShort(
  lifestage?: string | null,
  userDescription?: string | null,
): string {
  const slug = resolveLifestageSlug(lifestage, userDescription);
  if (slug) {
    return LIFESTAGE_SHORT_LABELS[slug];
  }

  const full = formatEducationLevelFull(lifestage, userDescription);
  return full === 'Not set' ? full : full.split('/')[0].trim();
}

/** @deprecated Use formatEducationLevelFull */
export function formatEducationLevel(
  lifestage?: string | null,
  userDescription?: string | null,
): string {
  return formatEducationLevelFull(lifestage, userDescription);
}

export function formatIntentLabel(value: string): string {
  const key = normalizeKey(value);
  if (INTENT_LABELS[key]) {
    return INTENT_LABELS[key];
  }
  if (value.includes('-')) {
    return value
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return value;
}

export function parseProfileIntents(
  profile: Pick<UserProfile, 'intents' | 'userHelp'>,
): string[] {
  const fromField = profile.intents?.filter(Boolean) ?? [];
  if (fromField.length > 0) {
    return fromField;
  }
  if (!profile.userHelp?.trim()) {
    return [];
  }

  const raw = profile.userHelp.trim();
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === 'string' && Boolean(item.trim()),
        );
      }
    } catch {
      return [];
    }
    return [];
  }

  return [raw];
}

export function formatMainGoal(intents: string[]): string {
  if (intents.length === 0) {
    return 'Not set';
  }
  return formatMainGoals(intents).join(' & ');
}

function formatDisplayLabel(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function formatMainGoals(intents: string[]): string[] {
  return intents.map((intent) => formatDisplayLabel(formatIntentLabel(intent)));
}

export function parseCuriousAboutTopics(userTopics?: string | null): string[] {
  if (!userTopics?.trim()) {
    return [];
  }
  return userTopics
    .split(',')
    .map((topic) => topic.trim())
    .filter(Boolean);
}

function normalizeYear(raw: string): string {
  const key = raw.trim().toLowerCase();
  return YEAR_LABELS[key] ?? raw.trim();
}

export function parseMajorAndYear(
  course?: string | null,
  academicYear?: string | null,
): { major: string; year: string } {
  if (academicYear?.trim()) {
    return {
      major: course?.trim() || 'Not set',
      year: normalizeYear(academicYear),
    };
  }

  if (!course?.trim()) {
    return { major: 'Not set', year: 'Not set' };
  }

  const parts = course
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const yearPart = parts.find((part) => YEAR_PATTERN.test(part));

  if (yearPart) {
    const majorParts = parts.filter((part) => part !== yearPart);
    return {
      major: majorParts.join(', ') || 'Not set',
      year: normalizeYear(yearPart),
    };
  }

  return { major: course.trim(), year: 'Not set' };
}

export function toDisplayUserProfile(
  profile: UserProfile | null | undefined,
): DisplayUserProfile {
  if (!profile) {
    return {
      educationLevel: 'Not set',
      educationLevelFull: 'Not set',
      lifestageSlug: null,
      year: 'Not set',
      major: 'Not set',
      mainGoal: 'Not set',
      mainGoals: [],
      curiousAbout: [],
    };
  }

  const intents = parseProfileIntents(profile);
  const { major, year } = parseMajorAndYear(profile.course, profile.academicYear);

  return {
    educationLevel: formatEducationLevelShort(profile.lifestage, profile.userDescription),
    educationLevelFull: formatEducationLevelFull(profile.lifestage, profile.userDescription),
    lifestageSlug: resolveLifestageSlug(profile.lifestage, profile.userDescription),
    year,
    major,
    mainGoal: formatMainGoal(intents),
    mainGoals: formatMainGoals(intents),
    curiousAbout: parseCuriousAboutTopics(profile.userTopics),
  };
}
