import Anthropic from "@anthropic-ai/sdk";
import { slackToPlainText } from "@/lib/slack/text";

// Reads ANTHROPIC_API_KEY from the environment automatically.
const client = new Anthropic();

const MODEL = "claude-haiku-4-5";

const SYSTEM = [
  "Tu génères des titres concis pour des tickets de support/produit en français.",
  "Réponds UNIQUEMENT avec le titre, sans guillemets, sans ponctuation finale.",
  "Le titre doit faire entre 3 et 10 mots, capturer le sujet principal,",
  "et rester compréhensible sans contexte supplémentaire.",
].join(" ");

function cleanTitle(raw: string): string {
  return raw
    .trim()
    .replace(/^["«'`]+|["»'`]+$/g, "") // strip surrounding quotes
    .replace(/[.!?,;:]+$/, "") // strip trailing punctuation
    .replace(/\s+/g, " ") // collapse whitespace
    .slice(0, 200);
}

// Generate a Claude-suggested title from a Slack message body. Returns null
// on any failure (rate limit, network, parse error) — the caller is expected
// to fall back to the existing first-line title.
export async function generateTitle(body: string): Promise<string | null> {
  const text = slackToPlainText(body).trim().slice(0, 4000);
  if (!text) return null;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 100, // titles are ~20 tokens; this is a deliberate cap
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Voici le contenu du ticket :\n\n${text}\n\nPropose un titre.`,
        },
      ],
    });

    for (const block of response.content) {
      if (block.type === "text") {
        const cleaned = cleanTitle(block.text);
        return cleaned || null;
      }
    }
    return null;
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error("[ai/title] rate limited");
    } else if (err instanceof Anthropic.APIError) {
      console.error(`[ai/title] API error ${err.status}:`, err.message);
    } else {
      console.error("[ai/title] unexpected error:", err);
    }
    return null;
  }
}

// Process N bodies in parallel, with bounded concurrency to stay well under
// rate limits even for large batches.
export async function generateTitlesBatch(
  bodies: { id: string; body: string }[],
  concurrency = 20
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (let i = 0; i < bodies.length; i += concurrency) {
    const chunk = bodies.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (item) => {
        const title = await generateTitle(item.body);
        return { id: item.id, title };
      })
    );
    for (const r of results) {
      if (r.title) out.set(r.id, r.title);
    }
  }
  return out;
}
