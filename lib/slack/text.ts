import { emojify } from "node-emoji";

// Convert Slack's mrkdwn-flavored text to a plain-text string suitable for
// titles, kanban cards, browser tabs, etc. — anywhere we can't render React.
//
//  <@U123|Label>      → @Label
//  <@U123>            → @U123
//  <#C123|name>       → #name
//  <https://url|lbl>  → lbl
//  <https://url>      → https://url
//  :emoji:            → unicode glyph (or left as-is if unknown)
//  :skin-tone-N:      → unicode skin modifier
//  *bold* _it_ ~st~   → bold / it / st  (only at word boundaries)

const SKIN_TONES: Record<string, string> = {
  "2": "\u{1F3FB}",
  "3": "\u{1F3FC}",
  "4": "\u{1F3FD}",
  "5": "\u{1F3FE}",
  "6": "\u{1F3FF}",
};

export function slackToPlainText(input: string): string {
  if (!input) return "";
  let out = input;

  out = out.replace(
    /<@([UW][A-Z0-9]+)(?:\|([^>]+))?>/g,
    (_, id: string, label?: string) => `@${label || id}`
  );

  out = out.replace(
    /<#([CG][A-Z0-9]+)(?:\|([^>]+))?>/g,
    (_, id: string, name?: string) => `#${name || id}`
  );

  out = out.replace(
    /<((?:https?|mailto):[^|>]+)(?:\|([^>]+))?>/g,
    (_, url: string, label?: string) => label || url
  );

  out = emojify(out);
  out = out.replace(/:skin-tone-([2-6]):/g, (_, n: string) => SKIN_TONES[n] ?? "");

  // Strip *bold* / _italic_ / ~strike~ markers only when surrounded by
  // boundaries (avoids mangling mid-word punctuation).
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?;:])/g, "$1$2");
  out = out.replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?;:])/g, "$1$2");
  out = out.replace(/(^|[\s(])~([^~\n]+)~(?=$|[\s).,!?;:])/g, "$1$2");

  return out;
}
