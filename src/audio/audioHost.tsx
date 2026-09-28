import { Asset } from 'expo-asset';
import { File } from 'expo-file-system';
import { useEffect, useRef } from 'react';
import { AppState, Platform, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

// Game audio on iOS and Android plays through Web Audio inside a hidden WebView.
//
// Why not expo-audio: it wraps AVPlayer, and every play or rewind fires a status
// observer on the main thread that waits on AVPlayer's internal lock. The game loop also
// runs on the main thread, so each coin, jump or power-up sound stalled a frame for
// 30-80 ms (measured with `sample` on the simulator; it matched the freezes seen on an
// iPhone). Expo Go ships no other audio engine. Web Audio runs in WebKit's own process:
// sounds are decoded once, and playing one is a short message plus a buffer start, so
// nothing in this process waits on audio.
//
// Web builds keep using expo-audio directly (see sfx.ts and music.ts).

export const USE_AUDIO_HOST = Platform.OS !== 'web';

type Clip = { name: string; source: number; volume: number };

// The page: an AudioContext, decoded buffers, a looping music source behind a gain, and a
// silent looping <audio> element. iOS mutes Web Audio with the ring switch unless the page
// is also playing media, and that element marks it as playing media.
const PAGE = `<!doctype html><html><body><script>
const ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
const master = ctx.createGain();
master.connect(ctx.destination);
const musicGain = ctx.createGain();
musicGain.gain.value = 0;
musicGain.connect(master);
const buffers = {};
const volumes = {};
let musicSource = null;
const post = (m) => window.ReactNativeWebView.postMessage(JSON.stringify(m));
const bytes = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};
const wake = () => { if (ctx.state !== 'running') ctx.resume(); };
const silent = document.createElement('audio');
silent.src = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
silent.loop = true;
silent.setAttribute('playsinline', '');
window.nr = {
  load(name, data, volume) {
    ctx.decodeAudioData(bytes(data)).then((buffer) => {
      buffers[name] = buffer;
      volumes[name] = volume;
      if (name === 'music') {
        musicSource = ctx.createBufferSource();
        musicSource.buffer = buffer;
        musicSource.loop = true;
        musicSource.connect(musicGain);
        musicSource.start();
      }
    }).catch((e) => post({ error: name + ': ' + e }));
  },
  play(names) {
    wake();
    for (const name of names) {
      const buffer = buffers[name];
      if (!buffer) continue;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = volumes[name];
      source.connect(gain);
      gain.connect(master);
      source.start();
    }
  },
  music(volume) {
    if (volume > 0) wake();
    musicGain.gain.setTargetAtTime(volume, ctx.currentTime, 0.12);
  },
  active(on) {
    if (on) { wake(); silent.play().catch(() => {}); }
    else { ctx.suspend(); silent.pause(); }
  },
};
silent.play().catch(() => {});
post({ ready: true });
</script></body></html>`;

let view: WebView | null = null;
let ready = false;
// Commands sent before the page is ready (e.g. the menu music) are kept, latest per key.
const pending = new Map<string, string>();

function send(key: string, js: string): void {
  if (ready && view) view.injectJavaScript(`${js};true;`);
  else pending.set(key, js);
}

export function hostPlay(names: string[]): void {
  if (names.length === 0 || !ready || !view) return;
  view.injectJavaScript(`nr.play(${JSON.stringify(names)});true;`);
}

export function hostMusicVolume(volume: number): void {
  send('music', `nr.music(${volume})`);
}

let clips: Clip[] = [];

// Registered by sfx.ts and music.ts at import time, loaded once the page is up.
export function registerClips(list: Clip[]): void {
  clips = clips.concat(list);
}

async function loadClips(target: WebView): Promise<void> {
  for (const clip of clips) {
    try {
      const asset = await Asset.fromModule(clip.source).downloadAsync();
      const data = await new File(asset.localUri ?? asset.uri).base64();
      target.injectJavaScript(
        `nr.load(${JSON.stringify(clip.name)},"${data}",${clip.volume});true;`,
      );
    } catch {
      // A missing sound should never stop the game.
    }
  }
}

// Mount once near the root. Invisible and ignores touches.
export function AudioHost() {
  const ref = useRef<WebView>(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      send('active', `nr.active(${next === 'active'})`);
    });
    return () => sub.remove();
  }, []);

  if (!USE_AUDIO_HOST) return null;

  const onMessage = (e: WebViewMessageEvent) => {
    let msg: { ready?: boolean; error?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.error && __DEV__) console.warn(`[audio] ${msg.error}`);
    if (msg.ready && ref.current) {
      view = ref.current;
      ready = true;
      for (const js of pending.values()) view.injectJavaScript(`${js};true;`);
      pending.clear();
      loadClips(view);
    }
  };

  return (
    <WebView
      ref={ref}
      source={{ html: PAGE }}
      originWhitelist={['*']}
      onMessage={onMessage}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback
      // If WebKit's process is killed (memory pressure), start over.
      onContentProcessDidTerminate={() => {
        ready = false;
        ref.current?.reload();
      }}
      // The WebView wraps itself in a flex: 1 container, which would take layout space.
      containerStyle={styles.hidden}
      style={styles.hidden}
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    />
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, left: -10, top: -10 },
});
