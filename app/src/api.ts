export type Title = {
  id: string; title: string; year: number; minutes: number;
  genres: string[]; moods: string[]; audience: string[]; keywords: string[];
  description: string; color: string; videoUrl: string | null;
};
export type Intent = { mood?: string; audience?: string; maxMinutes?: number; genres?: string[]; avoid?: string[] };
export type Pick = { id: string; why: string };
export type Action = { type: 'filter'; ids: string[] } | { type: 'highlight' | 'play'; id: string };
export type AssistResult = { reply: string; intent: Intent; picks: Pick[]; rejected: string[]; actions: Action[]; source: string };

// Emulator default. On a real Fire TV, set EXPO_PUBLIC_API_URL=http://<your-computer-LAN-IP>:8787
const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8787';

export async function ask(body: { text: string; intent: Intent; rejected: string[]; shown: string[] }): Promise<AssistResult> {
  const res = await fetch(`${BASE}/assist`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Assistant error ${res.status}`);
  return res.json();
}
