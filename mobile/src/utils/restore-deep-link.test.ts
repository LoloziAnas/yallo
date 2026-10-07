/**
 * @jest-environment jsdom
 * @jest-environment-options {"url": "http://localhost/yallo/app/"}
 */
import { takeDeepLink } from '@/utils/restore-deep-link';

const visit = (url: string) => window.history.replaceState(null, '', url);

describe('takeDeepLink (GitHub Pages ?p= redirect)', () => {
  const saved = process.env.EXPO_BASE_URL;
  beforeAll(() => {
    process.env.EXPO_BASE_URL = '/yallo/app';
  });
  afterAll(() => {
    process.env.EXPO_BASE_URL = saved;
  });

  it("reads the Pages 404's form: inner path + original query", () => {
    // /yallo/app/orders/48220?x=1 → /yallo/app/?p=%2Forders%2F48220%3Fx%3D1
    visit('/yallo/app/?p=%2Forders%2F48220%3Fx%3D1');
    expect(takeDeepLink()).toBe('/orders/48220?x=1');
  });

  it('accepts the full path too, and keeps other query params', () => {
    visit('/yallo/app/?p=%2Fyallo%2Fapp%2Forders&lang=fr');
    expect(takeDeepLink()).toBe('/orders?lang=fr');
  });

  it('keeps an encoded "#" in an order id', () => {
    visit('/yallo/app/?p=%2Forder%2F%252348220');
    expect(takeDeepLink()).toBe('/order/%2348220');
  });

  it('ignores links that would leave the site', () => {
    visit('/yallo/app/?p=%2F%2Fevil.example%2Fx');
    expect(takeDeepLink()).toBe('/');
    visit('/yallo/app/?p=javascript%3Aalert(1)');
    expect(takeDeepLink()).toBe('/');
  });

  it('is null without ?p=', () => {
    visit('/yallo/app/search');
    expect(takeDeepLink()).toBeNull();
  });
});
