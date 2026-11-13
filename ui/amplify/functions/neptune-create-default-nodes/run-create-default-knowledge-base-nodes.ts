export async function runCreateDefaultKnowledgeBaseNodes() {
  return {
    success: true,
    message: 'Neptune decommissioned — default nodes not created',
    counts: { subjects: 0, topics: 0, concepts: 0, exams: 0 },
  };
}
