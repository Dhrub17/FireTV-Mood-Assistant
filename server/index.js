import http from 'node:http';
import { readFileSync } from 'node:fs';
import { rank } from './lib/rank.js';
import { parse } from './lib/fallback.js';

const catalog = JSON.parse(readFileSync(new URL('../app/src/data/catalog.json', import.meta.url)));
const USE_BEDROCK = process.env.USE_BEDROCK === '1';
const PORT = process.env.PORT || 8787;

async function understandRequest(text, prev) {
  if (USE_BEDROCK && text.trim()) {
    try {
      const { understand } = await import('./lib/llm.js');
      const r = await understand(text, prev, catalog);
      return { ...r, intent: r.intent || prev, source: 'bedrock' };
    } catch (e) {
      console.warn('Bedrock failed, using rule-based parser:', e.message);
    }
  }
  return { ...parse(text, prev, catalog), source: 'rules' };
}

async function assist({ text = '', intent = {}, rejected = [], shown = [] }) {
  const u = await understandRequest(text, intent);
  const rej = [...rejected];
  if (u.rejectShown && shown[0]) rej.push(shown[0]);
  let picks = rank(catalog, u.intent, rej);
  if (u.matchId && !rej.includes(u.matchId)) {
    const m = catalog.find((c) => c.id === u.matchId);
    if (m) picks = [{ id: m.id, why: `That sounds like ${m.title}: ${m.description}` }, ...picks.filter((p) => p.id !== m.id)].slice(0, 3);
  }
  const actions = [{ type: 'filter', ids: picks.map((p) => p.id) }];
  if (picks[0]) actions.push({ type: u.play ? 'play' : 'highlight', id: picks[0].id });
  const top = catalog.find((c) => c.id === picks[0]?.id);
  const reply = u.reply || (top
    ? `Here are ${picks.length} picks. I'd start with ${top.title}.`
    : "I couldn't find a match. Try loosening the length or mood.");
  return { reply, intent: u.intent, picks, rejected: rej, actions, source: u.source };
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.url === '/health') return res.writeHead(200).end('ok');
  if (req.method === 'POST' && req.url === '/assist') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      try {
        const out = await assist(JSON.parse(body || '{}'));
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(out));
      } catch (e) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }
  res.writeHead(404).end();
}).listen(PORT, () => console.log(`Assistant API on :${PORT} (${USE_BEDROCK ? 'Bedrock' : 'rule-based'})`));
