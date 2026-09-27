// Web is only used for quick testing in a browser. Skia's CanvasKit (public/canvaskit.wasm)
// has to finish loading before any Skia code runs, so rendering waits for it.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

LoadSkiaWeb().then(() => {
  renderRootComponent(App);
});
