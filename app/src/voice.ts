import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

// Needs a speech recognizer on the device. If none is available (or permission is denied),
// onError fires and the app falls back to the suggestion phrases and the on-screen keyboard.
export async function listen(onResult: (text: string) => void, onError: (message: string) => void) {
  const subs: { remove: () => void }[] = [];
  const done = () => subs.forEach((s) => s.remove());
  try {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) throw new Error('microphone permission denied');
    subs.push(ExpoSpeechRecognitionModule.addListener('result', (e) => {
      const t = e.results?.[0]?.transcript;
      if (e.isFinal && t) { done(); onResult(t); }
    }));
    subs.push(ExpoSpeechRecognitionModule.addListener('error', (e) => { done(); onError(e.message || e.error); }));
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: false });
  } catch (e) {
    done();
    onError(e instanceof Error ? e.message : String(e));
  }
}
