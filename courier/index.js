// App entry: put a GitHub Pages deep link back (see src/web/restore-path.ts) before the router
// reads the address, then start Expo Router as usual.
import './src/web/restore-path';
import 'expo-router/entry';
