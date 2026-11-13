/**
 * Knowledge-base stubs after Neptune decommission.
 * Queries return empty lists; mutations echo inputs so clients don't error.
 */

export type KnowledgeBaseArgs = Record<string, unknown> & {
  actionType?: string;
  subject?: Record<string, unknown>;
  topic?: Record<string, unknown>;
  concept?: Record<string, unknown>;
  term?: Record<string, unknown>;
  exam?: Record<string, unknown>;
};

const now = () => new Date().toISOString();

function withTimestamps<T extends Record<string, unknown>>(item: T) {
  return {
    ...item,
    createdAt: (item.createdAt as string) || now(),
    updatedAt: now(),
  };
}

export async function runKnowledgeBaseQuery(args: KnowledgeBaseArgs) {
  const { actionType } = args;
  switch (actionType) {
    case 'listSubjects':
      return { success: true, subjectsList: [] };
    case 'listTopics':
      return { success: true, topics: [] };
    case 'listConcepts':
      return { success: true, concepts: [] };
    case 'listTerms':
      return { success: true, terms: [] };
    case 'listExams':
      return { success: true, exams: [] };
    case 'listConceptsByExam':
      return { success: true, concepts: [] };
    default:
      throw new Error(`Unknown query actionType: ${actionType}`);
  }
}

export async function runKnowledgeBaseMutation(args: KnowledgeBaseArgs) {
  const { actionType } = args;

  switch (actionType) {
    case 'createSubject':
    case 'updateSubject':
      if (!args.subject?.id || !args.subject?.displayName) {
        throw new Error('subject.id and subject.displayName are required');
      }
      return { success: true, subjectItem: withTimestamps(args.subject) };
    case 'deleteSubject':
      return { success: true, message: 'Subject deleted (stub — not persisted)' };
    case 'createTopic':
    case 'updateTopic':
      if (!args.topic?.id || !args.topic?.displayName) {
        throw new Error('topic.id and topic.displayName are required');
      }
      return { success: true, topic: withTimestamps(args.topic) };
    case 'deleteTopic':
      return { success: true, message: 'Topic deleted (stub — not persisted)' };
    case 'createConcept':
    case 'updateConcept':
      if (!args.concept?.id || !args.concept?.displayName) {
        throw new Error('concept.id and concept.displayName are required');
      }
      return { success: true, concept: withTimestamps(args.concept) };
    case 'deleteConcept':
      return { success: true, message: 'Concept deleted (stub — not persisted)' };
    case 'createTerm':
    case 'updateTerm':
      if (!args.term?.id || !args.term?.displayName) {
        throw new Error('term.id and term.displayName are required');
      }
      return { success: true, term: withTimestamps(args.term) };
    case 'deleteTerm':
      return { success: true, message: 'Term deleted (stub — not persisted)' };
    case 'createExam':
    case 'updateExam':
      if (!args.exam?.id || !args.exam?.displayName) {
        throw new Error('exam.id and exam.displayName are required');
      }
      return { success: true, exam: withTimestamps(args.exam) };
    case 'deleteExam':
      return { success: true, message: 'Exam deleted (stub — not persisted)' };
    case 'linkConceptToExam':
    case 'unlinkConceptFromExam':
      return { success: true, message: `${actionType} completed (stub — not persisted)` };
    default:
      throw new Error(`Unknown mutation actionType: ${actionType}`);
  }
}

export const KNOWLEDGE_BASE_QUERY_ACTIONS = [
  'listSubjects',
  'listTopics',
  'listConcepts',
  'listTerms',
  'listExams',
  'listConceptsByExam',
] as const;

export const KNOWLEDGE_BASE_MUTATION_ACTIONS = [
  'createSubject',
  'updateSubject',
  'deleteSubject',
  'createTopic',
  'updateTopic',
  'deleteTopic',
  'createConcept',
  'updateConcept',
  'deleteConcept',
  'createTerm',
  'updateTerm',
  'deleteTerm',
  'createExam',
  'updateExam',
  'deleteExam',
  'linkConceptToExam',
  'unlinkConceptFromExam',
] as const;
