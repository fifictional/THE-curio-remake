import { describe, expect, it } from 'vitest';
import {
  formatEducationLevelFull,
  formatEducationLevelShort,
  formatIntentLabel,
  formatMainGoal,
  formatMainGoals,
  parseCuriousAboutTopics,
  parseMajorAndYear,
  parseProfileIntents,
  toDisplayUserProfile,
} from './user-profile-display';

describe('formatEducationLevelFull', () => {
  it('maps lifestage slugs to readable labels', () => {
    expect(formatEducationLevelFull('college')).toBe('College / Undergraduate');
  });

  it('resolves legacy userDescription slugs', () => {
    expect(formatEducationLevelFull(null, 'high-school')).toBe('High School Student');
  });
});

describe('formatEducationLevelShort', () => {
  it('shows compact education labels in the grid', () => {
    expect(formatEducationLevelShort('college')).toBe('Undergraduate');
    expect(formatEducationLevelShort(null, 'high-school')).toBe('High School');
  });
});

describe('formatIntentLabel', () => {
  it('maps legacy intent slugs to readable labels', () => {
    expect(formatIntentLabel('exam-prep')).toBe('Prep for an upcoming exam');
  });
});

describe('parseProfileIntents', () => {
  it('prefers structured intents array', () => {
    expect(
      parseProfileIntents({
        intents: ['Ace my exams'],
        userHelp: '["Legacy goal"]',
      }),
    ).toEqual(['Ace my exams']);
  });

  it('parses JSON userHelp without showing raw syntax', () => {
    expect(
      parseProfileIntents({
        intents: null,
        userHelp: '["Ace my exams","Understand a tough topic"]',
      }),
    ).toEqual(['Ace my exams', 'Understand a tough topic']);
  });

  it('falls back to plain-text userHelp', () => {
    expect(
      parseProfileIntents({
        intents: null,
        userHelp: 'Prepare for MCAT',
      }),
    ).toEqual(['Prepare for MCAT']);
  });
});

describe('parseCuriousAboutTopics', () => {
  it('splits comma-separated topics', () => {
    expect(parseCuriousAboutTopics('Behavioral economics, Astronomy, Psychology')).toEqual([
      'Behavioral economics',
      'Astronomy',
      'Psychology',
    ]);
  });
});

describe('parseMajorAndYear', () => {
  it('uses academicYear when present', () => {
    expect(parseMajorAndYear('Biology, Pre-Med', 'Sophomore (2nd year)')).toEqual({
      major: 'Biology, Pre-Med',
      year: 'Sophomore (2nd year)',
    });
  });

  it('extracts year from course text', () => {
    expect(parseMajorAndYear('Computer Science, Year 2')).toEqual({
      major: 'Computer Science',
      year: 'Sophomore (2nd year)',
    });
  });
});

describe('formatMainGoals', () => {
  it('returns sentence-case pill labels for each intent', () => {
    expect(formatMainGoals(['exam-prep', 'summarize-video'])).toEqual([
      'Prep for an upcoming exam',
      'Summarize a video',
    ]);
  });
});

describe('formatMainGoal', () => {
  it('joins multiple intents for display', () => {
    expect(formatMainGoal(['Ace my exams', 'Organise my notes'])).toBe(
      'Ace my exams & Organise my notes',
    );
  });

  it('formats legacy intent slugs', () => {
    expect(formatMainGoal(['exam-prep'])).toBe('Prep for an upcoming exam');
  });
});

describe('toDisplayUserProfile', () => {
  it('builds a display-ready profile object', () => {
    expect(
      toDisplayUserProfile({
        userUuid: 'u1',
        onboardingCompleted: true,
        onboardingSkipped: false,
        lifestage: 'college',
        academicYear: 'Sophomore (2nd year)',
        course: 'Biology, Pre-Med',
        intents: ['Ace my exams'],
        userHelp: '["Ace my exams"]',
        userTopics: 'Behavioral economics, Astronomy',
      }),
    ).toEqual({
      educationLevel: 'Undergraduate',
      educationLevelFull: 'College / Undergraduate',
      lifestageSlug: 'college',
      year: 'Sophomore (2nd year)',
      major: 'Biology, Pre-Med',
      mainGoal: 'Ace my exams',
      mainGoals: ['Ace my exams'],
      curiousAbout: ['Behavioral economics', 'Astronomy'],
    });
  });

  it('formats legacy onboarding slugs', () => {
    expect(
      toDisplayUserProfile({
        userUuid: 'u1',
        onboardingCompleted: true,
        onboardingSkipped: false,
        userDescription: 'high-school',
        userHelp: 'exam-prep',
      }),
    ).toEqual({
      educationLevel: 'High School',
      educationLevelFull: 'High School Student',
      lifestageSlug: 'high-school',
      year: 'Not set',
      major: 'Not set',
      mainGoal: 'Prep for an upcoming exam',
      mainGoals: ['Prep for an upcoming exam'],
      curiousAbout: [],
    });
  });
});
