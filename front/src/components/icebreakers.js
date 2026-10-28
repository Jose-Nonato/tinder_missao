import { topicAgreement } from './topicAgreement.js'

export function icebreakers(breakdown = []) {
  const topics = topicAgreement(breakdown).filter(t => t.agreements > 0 && t.topic).slice(0, 3)
  const suggestions = topics.map(({ topic }) => `Oi! Que tal conversar sobre ${topic}? O que mais desperta sua curiosidade nesse tema?`)
  if (topics.length === 1) suggestions.push(`Sobre ${topics[0].topic}: tem algum livro, filme ou experiência que você gostaria de compartilhar?`)
  return suggestions
}
