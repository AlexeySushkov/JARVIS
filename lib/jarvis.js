// Шов под будущий LLM (v2: серверный прокси /api/llm).
// В v1 — локальный pass-through: свободный текст просто становится «делом».
export function parseAnswer(text) {
  return { activity: String(text ?? '').trim() };
}
