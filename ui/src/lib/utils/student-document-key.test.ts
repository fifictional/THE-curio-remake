import { describe, expect, it } from 'vitest';
import {
  normalizeStudentDocumentStorageKey,
  parseOwnerUuidFromStudentDocumentKey,
} from './student-document-key';

describe('normalizeStudentDocumentStorageKey', () => {
  it('returns key unchanged when it already starts with student-documents/', () => {
    const k = 'student-documents/u1/d1/file.pdf';
    expect(normalizeStudentDocumentStorageKey(k)).toBe(k);
  });

  it('strips arbitrary prefix before student-documents/', () => {
    expect(
      normalizeStudentDocumentStorageKey('public/student-documents/u1/d1/file.pdf'),
    ).toBe('student-documents/u1/d1/file.pdf');
  });
});

describe('parseOwnerUuidFromStudentDocumentKey', () => {
  it('parses owner after normalization', () => {
    expect(
      parseOwnerUuidFromStudentDocumentKey('public/student-documents/abc-123/d1/file.pdf'),
    ).toBe('abc-123');
  });

  it('returns null for unrelated paths', () => {
    expect(parseOwnerUuidFromStudentDocumentKey('images/foo.png')).toBeNull();
  });
});
