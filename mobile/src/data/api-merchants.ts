// Which shared merchant (m1–m9 in @yallo/shared) receives orders for each store in this app's catalogue.
// Temporary: the two lists differ until one is chosen as canonical, so this file is the only bridge.
import type { ZoneName } from '@yallo/shared';

export const merchantForStore: Record<string, string> = {
  s1: 'm1', // Dar Zitoun → Café Marrakech (Moroccan)
  s2: 'm2', // Burger Atlas → Burger House
  s3: 'm8', // Pizzeria Guéliz → Pizza Napoli
  s4: 'm6', // Pâtisserie Al Warda → Pâtisserie Al Jawda
  s5: 'm4', // Souk Frais Market → Carrefour Market Guéliz
  s6: 'm3', // Pharmacie Ibn Sina → Pharmacie Atlas
  s7: 'm1', // Jus Jemaa → Café Marrakech
  s8: 'm4', // Maison Argane → Carrefour Market Guéliz
  s9: 'm9', // Sushi Majorelle → Sushi Kawa
  s10: 'm5', // Snack Chez Hamid → Snack Amine
};

const zones: ZoneName[] = [
  'Guéliz',
  'Hivernage',
  'Médina',
  'Daoudiate',
  'Semlalia',
  'Targa',
  'Agdal',
];

const fold = (x: string) =>
  x
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/** Delivery zone for an address neighbourhood; Guéliz when it isn't one of the shared zones. */
export function zoneForDistrict(district: string): ZoneName {
  return zones.find((z) => fold(z) === fold(district.trim())) ?? 'Guéliz';
}
