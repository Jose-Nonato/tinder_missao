export function firstPending(questions, chosen) {
  return Math.max(0, questions.findIndex(q => !chosen[q.code]))
}
