// A contagem por tópico explica o breakdown; não substitui o score ponderado da API.
export function topicAgreement(breakdown = []) {
  const topics = new Map()
  for (const item of breakdown) {
    const row = topics.get(item.topic) || { topic: item.topic, total: 0, agreements: 0 }
    row.total += 1
    row.agreements += Number(item.agree)
    topics.set(item.topic, row)
  }
  return [...topics.values()].map(t => ({ ...t, percent: Math.round(t.agreements / t.total * 100) }))
    .sort((a, b) => b.percent - a.percent || b.agreements - a.agreements)
}
