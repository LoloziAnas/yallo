// Courier GPS: foreground while online, background (screen off / app in the background) while on
// a delivery. Background updates need a development or store build; Expo Go and the web preview
// run foreground-only.
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { useEffect } from 'react';
import { Linking, Platform } from 'react-native';

import { COURIER_ID, api } from '@/api/client';
import { inDelivery, useCourier, type Data } from '@/store/courier-store';

const BG_TASK = 'yallo-courier-location';
/** Position reports are worth sending at most this often. */
const REPORT_MS = 5000;

/** Where tracking stands: `foreground-only` means background updates aren't available here. */
export type Tracking = 'off' | 'foreground' | 'background' | 'foreground-only';

let lastReport = 0;

/** Optional on the shared client until the server's location endpoint lands. */
type WithLocation = {
  reportCourierLocation?: (id: string, lat: number, lon: number) => Promise<unknown>;
};

function onFix(l: Location.LocationObject) {
  const { latitude: lat, longitude: lon, accuracy } = l.coords;
  useCourier.setState({ gps: { lat, lon, accuracy: accuracy ?? null, at: l.timestamp } });
  if (Date.now() - lastReport < REPORT_MS) return;
  lastReport = Date.now();
  // Positions from a real phone override the server's simulated movement once it accepts them.
  (api as WithLocation | null)?.reportCourierLocation?.(COURIER_ID, lat, lon)?.catch(() => {});
}

// Background updates arrive here even while the UI is suspended; must be defined at module scope.
if (Platform.OS !== 'web') {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    BG_TASK,
    async ({ data, error }) => {
      const last = data?.locations?.at(-1);
      if (!error && last) onFix(last);
    },
  );
}

/** Asks for "while using the app" location. Opens Settings if the courier denied it before. */
export async function requestForegroundLocation(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  const current = await Location.getForegroundPermissionsAsync();
  let granted = current.granted;
  if (!granted && !current.canAskAgain) Linking.openSettings().catch(() => {});
  else if (!granted) granted = (await Location.requestForegroundPermissionsAsync()).granted;
  useCourier.setState({ locationOk: granted });
  return granted;
}

/** Goes online once the courier allows location; otherwise shows the "Location is off" screen. */
export async function goOnlineWithLocation() {
  const s = useCourier.getState();
  if (s.simulate === 'location-denied') return s.set({ edge: 'location', edgeT: 0 });
  if (await requestForegroundLocation()) useCourier.getState().goOnline(true);
  else useCourier.getState().set({ edge: 'location', edgeT: 0 });
}

async function startBackground(): Promise<Tracking> {
  try {
    // A job can start without "Go online" (already assigned at sign-in); Android only grants
    // background location on top of foreground location, so ask for that first.
    if (!(await requestForegroundLocation())) return 'off';
    if (!(await Location.requestBackgroundPermissionsAsync()).granted) return 'foreground-only';
    if (!(await Location.hasStartedLocationUpdatesAsync(BG_TASK))) {
      await Location.startLocationUpdatesAsync(BG_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 15,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        activityType: Location.LocationActivityType.OtherNavigation,
        foregroundService: {
          notificationTitle: 'Yallo · delivery in progress',
          notificationBody: 'Sharing your location until the order is delivered.',
          notificationColor: '#cf4520',
        },
      });
    }
    return 'background';
  } catch {
    // Expo Go on Android, or a build without the background capability.
    return 'foreground-only';
  }
}

async function stopBackground() {
  try {
    if (await Location.hasStartedLocationUpdatesAsync(BG_TASK))
      await Location.stopLocationUpdatesAsync(BG_TASK);
  } catch {
    // Nothing was running.
  }
}

/**
 * Keeps GPS running while the courier is online, and in the background while on a delivery.
 * Mounted once at the root.
 */
export function useTracking() {
  const online = useCourier((s) => s.signedIn && s.online);
  const onJob = useCourier((s) => inDelivery(s.phase));
  const locationOk = useCourier((s) => s.locationOk);

  // Pick up a permission granted earlier (e.g. on a previous launch).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Location.getForegroundPermissionsAsync()
      .then((p) => useCourier.setState({ locationOk: p.granted }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !online || !locationOk) {
      useCourier.setState({ tracking: 'off' });
      return;
    }
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    (async () => {
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 15 },
        onFix,
      );
      if (cancelled) sub.remove();
      else useCourier.setState({ tracking: 'foreground' });
    })().catch(() => {});
    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [online, locationOk]);

  useEffect(() => {
    if (Platform.OS === 'web' || !online) return;
    if (!onJob) {
      stopBackground();
      return;
    }
    let cancelled = false;
    startBackground().then((t) => {
      if (!cancelled) useCourier.setState({ tracking: t });
    });
    return () => {
      cancelled = true;
    };
  }, [online, onJob]);
}

/** GPS accuracy worse than this is flagged to the courier as a weak signal. */
export const WEAK_GPS_M = 100;

export const isWeakGps = (s: Pick<Data, 'gps' | 'simulate'>) =>
  s.simulate === 'poor-gps' || (s.gps?.accuracy ?? 0) > WEAK_GPS_M;
