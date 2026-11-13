const STUDENT_DOCUMENTS_PREFIX = 'student-documents/';

/**
 * Some Storage clients return a path with a prefix before `student-documents/`.
 * Strip any leading segments so owner parsing stays reliable.
 */
export function normalizeStudentDocumentStorageKey(originalKey: string): string {
  const trimmed = originalKey.trim();
  if (trimmed.startsWith(STUDENT_DOCUMENTS_PREFIX)) {
    return trimmed;
  }
  const idx = trimmed.indexOf(STUDENT_DOCUMENTS_PREFIX);
  if (idx === -1) {
    return trimmed;
  }
  return trimmed.slice(idx);
}

/**
 * Parses the owning user id from an S3 key under student-documents/{userUuid}/...
 * Returns null if the path is not in the expected format.
 */
export function parseOwnerUuidFromStudentDocumentKey(originalKey: string): string | null {
  const key = normalizeStudentDocumentStorageKey(originalKey);
  if (!key.startsWith(STUDENT_DOCUMENTS_PREFIX)) {
    return null;
  }
  const rest = key.slice(STUDENT_DOCUMENTS_PREFIX.length);
  const firstSlash = rest.indexOf('/');
  if (firstSlash <= 0) {
    return null;
  }
  return rest.slice(0, firstSlash);
}
