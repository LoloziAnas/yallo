import { Platform } from 'react-native';

/**
 * Accessibility role for tappable cards and rows that contain other buttons (favourite hearts, add
 * buttons). On web a `button` role renders a <button>, and buttons can't nest, so these get no role there.
 */
export const cardRole = Platform.OS === 'web' ? undefined : ('button' as const);
