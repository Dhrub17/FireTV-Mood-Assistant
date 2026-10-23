import { useCallback, useState, type ReactNode } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import catalogJson from './src/data/catalog.json';
import { ask, type Intent, type Pick, type Title } from './src/api';
import { listen } from './src/voice';
import Player from './src/Player';

const catalog = catalogJson as Title[];
const C = { base: '#101C2B', surface: '#1A2B3F', text: '#F3EBDD', muted: '#9FB0C3', lamp: '#FFB347', teal: '#5FC4B8' };
const SUGGESTIONS = [
  "I'm exhausted, something light",
  'Movie night with the kids, under 20 minutes',
  'That one where a robot fights in Amsterdam',
  'Surprise me with something funny',
];

function Focusable(props: { onPress: () => void; style?: StyleProp<ViewStyle>; focusedStyle?: StyleProp<ViewStyle>; preferred?: boolean; children: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable onPress={props.onPress} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      hasTVPreferredFocus={props.preferred} style={[props.style, focused && (props.focusedStyle ?? s.focus)]}>
      {props.children}
    </Pressable>
  );
}

function intentChips(intent: Intent): { label: string; without: Intent }[] {
  const chips: { label: string; without: Intent }[] = [];
  if (intent.mood) chips.push({ label: `Mood: ${intent.mood}`, without: { ...intent, mood: undefined } });
  if (intent.audience) chips.push({ label: `Watching: ${intent.audience}`, without: { ...intent, audience: undefined } });
  if (intent.maxMinutes) chips.push({ label: `Under ${intent.maxMinutes} min`, without: { ...intent, maxMinutes: undefined } });
  for (const a of intent.avoid ?? []) chips.push({ label: `No ${a}`, without: { ...intent, avoid: (intent.avoid ?? []).filter((x) => x !== a) } });
  return chips;
}

export default function App() {
  const [intent, setIntent] = useState<Intent>({});
  const [picks, setPicks] = useState<Pick[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const [reply, setReply] = useState("Tell me what you're in the mood for, or choose a phrase below.");
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [playing, setPlaying] = useState<Title | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);

  const send = useCallback(async (q: string, nextIntent: Intent = intent, nextRejected: string[] = rejected) => {
    setBusy(true);
    try {
      const res = await ask({ text: q, intent: nextIntent, rejected: nextRejected, shown: picks.map((p) => p.id) });
      setIntent(res.intent); setPicks(res.picks); setRejected(res.rejected); setReply(res.reply);
      for (const a of res.actions) {
        if (a.type === 'highlight') setHighlight(a.id);
        if (a.type === 'play') { const t = catalog.find((c) => c.id === a.id); if (t) setPlaying(t); }
      }
    } catch {
      setReply("I can't reach the assistant. Start the server and check EXPO_PUBLIC_API_URL.");
    } finally { setBusy(false); setText(''); }
  }, [intent, rejected, picks]);

  const startVoice = () => {
    setListening(true); setReply('Listening...');
    listen((t) => { setListening(false); send(t); }, (m) => { setListening(false); setReply(`Voice isn't available (${m}). Use a phrase below instead.`); });
  };
  const reset = () => { setIntent({}); setPicks([]); setRejected([]); setHighlight(null); setReply('Fresh start. What are you in the mood for?'); };

  if (playing) return <Player title={playing} onClose={() => setPlaying(null)} />;

  const whyById = new Map(picks.map((p) => [p.id, p.why]));
  const visible: Title[] = picks.length ? picks.map((p) => catalog.find((c) => c.id === p.id)!).filter(Boolean) : catalog;

  return (
    <View style={s.root}>
      <View style={s.panel}>
        <Text style={s.reply}>{busy ? 'Thinking...' : reply}</Text>
        <View style={s.row}>
          {intentChips(intent).map((c) => (
            <Focusable key={c.label} style={s.chip} onPress={() => { setIntent(c.without); send('', c.without); }}>
              <Text style={s.chipText}>{c.label}  ×</Text>
            </Focusable>
          ))}
        </View>
        <View style={s.row}>
          <Focusable preferred style={s.mic} onPress={startVoice}><Text style={s.micText}>{listening ? 'Listening' : 'Speak'}</Text></Focusable>
          <TextInput value={text} onChangeText={setText} onSubmitEditing={() => text.trim() && send(text)}
            placeholder="or type here" placeholderTextColor={C.muted} style={s.input} />
        </View>
        {picks.length > 0 && (
          <View style={s.row}>
            <Focusable style={s.action} onPress={() => send('not that')}><Text style={s.actionText}>Not this one</Text></Focusable>
            <Focusable style={s.action} onPress={reset}><Text style={s.actionText}>Start over</Text></Focusable>
          </View>
        )}
        {SUGGESTIONS.map((q) => (
          <Focusable key={q} style={s.suggest} onPress={() => send(q)}><Text style={s.suggestText}>{q}</Text></Focusable>
        ))}
      </View>

      <FlatList data={visible} keyExtractor={(t) => t.id} numColumns={2} style={s.grid} contentContainerStyle={{ padding: 24 }}
        renderItem={({ item }) => (
          <Focusable onPress={() => setPlaying(item)} style={[s.card, { backgroundColor: item.color }, item.id === highlight && s.cardPick]} focusedStyle={s.cardFocus}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardMeta}>{item.year}, {item.minutes} min</Text>
            <Text style={s.cardWhy} numberOfLines={3}>{whyById.get(item.id) ?? item.description}</Text>
          </Focusable>
        )} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: C.base },
  panel: { width: '40%', padding: 36, gap: 18 },
  reply: { color: C.text, fontSize: 34, lineHeight: 44, fontWeight: '600', minHeight: 132 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  chip: { backgroundColor: 'transparent', borderWidth: 2, borderColor: C.teal, borderRadius: 24, paddingVertical: 8, paddingHorizontal: 18 },
  chipText: { color: C.teal, fontSize: 22 },
  mic: { backgroundColor: C.lamp, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 34 },
  micText: { color: C.base, fontSize: 26, fontWeight: '700' },
  input: { flex: 1, minWidth: 200, backgroundColor: C.surface, color: C.text, fontSize: 24, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 14 },
  action: { backgroundColor: C.surface, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 22 },
  actionText: { color: C.text, fontSize: 22 },
  suggest: { backgroundColor: C.surface, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  suggestText: { color: C.muted, fontSize: 22 },
  focus: { borderColor: C.lamp, borderWidth: 3, transform: [{ scale: 1.04 }] },
  grid: { flex: 1 },
  card: { flex: 1, margin: 12, minHeight: 220, borderRadius: 16, padding: 24, borderWidth: 3, borderColor: 'transparent', justifyContent: 'flex-end' },
  cardPick: { borderColor: C.teal },
  cardFocus: { borderColor: C.lamp, transform: [{ scale: 1.05 }] },
  cardTitle: { color: '#fff', fontSize: 32, fontWeight: '700' },
  cardMeta: { color: '#ffffffcc', fontSize: 20, marginTop: 4 },
  cardWhy: { color: '#fffffff0', fontSize: 20, lineHeight: 27, marginTop: 10 },
});
