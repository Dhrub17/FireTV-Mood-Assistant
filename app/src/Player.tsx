import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { Title } from './api';

export default function Player({ title, onClose }: { title: Title; onClose: () => void }) {
  const player = useVideoPlayer(title.videoUrl, (p) => { p.play(); });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose]);

  return (
    <View style={s.root}>
      {title.videoUrl ? (
        <VideoView player={player} style={s.video} nativeControls />
      ) : (
        <View style={s.video}><Text style={s.note}>{title.title} has no stream in this demo build.</Text></View>
      )}
      <Pressable hasTVPreferredFocus onPress={onClose} style={({ focused }) => [s.back, focused && s.backFocused]}>
        <Text style={s.backText}>Back to picks</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  note: { color: '#F3EBDD', fontSize: 32 },
  back: { position: 'absolute', top: 32, left: 40, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 10, backgroundColor: '#1A2B3F' },
  backFocused: { backgroundColor: '#FFB347' },
  backText: { color: '#F3EBDD', fontSize: 24, fontWeight: '600' },
});
