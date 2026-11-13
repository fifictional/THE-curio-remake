import { a } from "@aws-amplify/backend";

/**
 * Knowledge Base Custom Types
 * These types define the structure for Subjects, Topics, Concepts, Terms, and Exams
 * in the Neptune graph database knowledge base.
 * 
 * Hierarchy: Subject → Topic → Concept → Term
 * In Neptune: SUBJECT → TOPIC → CONCEPT → TERM
 */

// Custom type for Subject (top level)
export const Subject = a.customType({
  id: a.string().required(),
  displayName: a.string().required(),
  description: a.string(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
});

// Subject list item (for query returns with topic list)
export const SubjectListItem = a.customType({
  id: a.string().required(),
  displayName: a.string().required(),
  description: a.string(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
  topicsList: a.string().array(),
});

// Custom type for Topic (middle level)
export const Topic = a.customType({
  id: a.string().required(),
  displayName: a.string().required(),
  description: a.string(),
  order: a.integer(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
});

// Topic list item (for query returns with subject info and lists)
export const TopicListItem = a.customType({
  id: a.string().required(),
  displayName: a.string().required(),
  description: a.string(),
  order: a.integer(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
  conceptsList: a.string().array(),
  subjectsList: a.string().array(),
});

// Custom type for Concept
export const Concept = a.customType({
  id: a.string().required(),
  displayName: a.string().required(),
  description: a.string(),
  difficulty: a.integer(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
});

// Concept list item (for query returns with hierarchy info and lists)
export const ConceptListItem = a.customType({
  id: a.string().required(),
  displayName: a.string().required(),
  description: a.string(),
  difficulty: a.integer(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
  topicId: a.string(),
  topicDisplayName: a.string(),
  subjectId: a.string(),
  subjectDisplayName: a.string(),
  topicsList: a.string().array(),
  termsList: a.string().array(),
  subjectsList: a.string().array(),
});

// Custom type for Term
export const Term = a.customType({
  id: a.string().required(),
  term: a.string().required(),
  definition: a.string().required(),
  context: a.string(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
});

// Custom type for Exam
export const Exam = a.customType({
  id: a.string().required(),
  name: a.string().required(),
  description: a.string(),
  createdAt: a.datetime().required(),
  updatedAt: a.datetime().required(),
});

// Knowledge Base Input Types
export const SubjectInput = a.customType({
  id: a.string(),
  displayName: a.string(),
  description: a.string(),
});

export const TopicInput = a.customType({
  id: a.string(),
  displayName: a.string(),
  description: a.string(),
  order: a.integer(),
  subjectId: a.string(),
});

export const ConceptInput = a.customType({
  id: a.string(),
  displayName: a.string(),
  description: a.string(),
  difficulty: a.integer(),
  topicId: a.string(),
});

export const TermInput = a.customType({
  id: a.string(),
  term: a.string(),
  definition: a.string(),
  context: a.string(),
  conceptId: a.string(),
});

export const ExamInput = a.customType({
  id: a.string(),
  name: a.string(),
  description: a.string(),
});

