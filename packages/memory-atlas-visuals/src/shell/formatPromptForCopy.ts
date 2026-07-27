// Browser-side mirror of formatPrompt from src/dev/raw-prompts.ts.
// Must produce the identical string — no Node imports allowed here.
export function formatPromptForCopy(source: string, body: string): string {
  return `Written while looking at: @syndcast-mind/${source}\n\n${body}`
}
