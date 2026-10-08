import pkg from '../../package.json';

/** "1.0.0 · 3f2a9c1": the version and the commit it was built from (VITE_BUILD_SHA / GITHUB_SHA). */
export const BUILD_LABEL = [pkg.version, import.meta.env.VITE_BUILD_SHA].filter(Boolean).join(' · ');
