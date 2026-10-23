// Rule-based intent parser: keeps the demo working with no AWS credentials.
const MOODS = {
  relaxed: ['tired', 'exhausted', 'relax', 'light', 'chill', 'calm', 'unwind'],
  cozy: ['cozy', 'gentle', 'warm'],
  funny: ['funny', 'laugh', 'comedy', 'hilarious'],
  exciting: ['exciting', 'action', 'thrill', 'fast'],
  emotional: ['emotional', 'sad', 'cry', 'touching', 'moving'],
  spooky: ['scary', 'spooky', 'horror', 'creepy'],
  adventurous: ['adventure', 'quest', 'epic'],
  mysterious: ['weird', 'strange', 'trippy', 'mysterious'],
};
const AVOIDABLE = { spooky: ['scary', 'spooky', 'horror', 'creepy'], slow: ['slow', 'boring', 'dull'] };
const has = (text, words) => words.some((w) => text.includes(w));

export function parse(text, prev = {}, catalog = []) {
  const t = ` ${text.toLowerCase()} `;
  const intent = { ...prev, avoid: [...(prev.avoid || [])] };
  const out = { intent, rejectShown: false, play: false, matchId: null };

  // Negations first, so "nothing scary" does not set mood=spooky.
  const negated = (w) => new RegExp(`(no|not|nothing|avoid|without|too)\\s+(too\\s+)?${w}`).test(t);
  for (const [tag, words] of Object.entries(AVOIDABLE)) {
    if (words.some(negated)) {
      if (!intent.avoid.includes(tag)) intent.avoid.push(tag);
      if (tag === 'slow') out.rejectShown = true;
    }
  }
  if (has(t, ['not that', 'something else', 'next one', 'another'])) out.rejectShown = true;

  const avoided = new Set(intent.avoid);
  for (const [mood, words] of Object.entries(MOODS)) {
    if (has(t, words) && !words.some(negated) && !avoided.has(mood)) { intent.mood = mood; break; }
  }

  if (has(t, ['kid', 'child', 'toddler'])) intent.audience = 'kids';
  else if (has(t, ['family', 'parents', 'grandparents', 'everyone', 'whole'])) intent.audience = 'family';
  else if (has(t, ['adult', 'date night', 'by myself', 'alone'])) intent.audience = 'adults';

  const m = t.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b|minutes?|mins?)/);
  if (m) intent.maxMinutes = Math.round(parseFloat(m[1]) * (m[2].startsWith('h') ? 60 : 1));
  else if (has(t, ['short', 'quick'])) intent.maxMinutes = 15;

  if (has(t, ['play', 'surprise me', 'put on'])) out.play = true;

  // Tip-of-the-tongue: match remembered details against catalog keywords.
  const words = t.split(/[^a-z']+/).filter(Boolean);
  let best = null;
  for (const c of catalog) {
    const hits = c.keywords.filter((k) => k.split(' ').every((w) => words.includes(w))).length;
    if (hits && (!best || hits > best.hits)) best = { id: c.id, hits };
  }
  if (best && !intent.mood) out.matchId = best.id;

  return out;
}
