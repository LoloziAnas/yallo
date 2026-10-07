// Signs Android release builds with the Yallo keystore, which lives outside git (see scripts/build-apk.mjs).
// The keystore's properties file is named by YALLO_KEYSTORE_PROPS at Gradle time:
//   storeFile=/home/me/yallo-keys/yallo-customer.jks
//   storePassword=…  keyAlias=yallo-customer  keyPassword=…
// Without it (e.g. `expo run:android` dev builds), release stays signed with the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const RELEASE_CONFIG = `
        release {
            def yalloProps = System.getenv('YALLO_KEYSTORE_PROPS')
            if (yalloProps) {
                def p = new Properties()
                file(yalloProps).withInputStream { p.load(it) }
                storeFile file(p['storeFile'])
                storePassword p['storePassword']
                keyAlias p['keyAlias']
                keyPassword p['keyPassword']
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (!g.includes("System.getenv('YALLO_KEYSTORE_PROPS')")) {
      g = g.replace(/signingConfigs \{/, (m) => m + RELEASE_CONFIG);
      // The template's release build type signs with the debug key; use ours when it's provided. Only look
      // inside buildTypes: signingConfigs now has a "release {" block too.
      const at = g.indexOf('buildTypes {');
      if (at < 0) throw new Error('release-signing: no buildTypes block in app/build.gradle');
      const types = g
        .slice(at)
        .replace(
          /(release \{[^}]*?)signingConfig signingConfigs\.debug/,
          "$1signingConfig System.getenv('YALLO_KEYSTORE_PROPS') ? signingConfigs.release : signingConfigs.debug",
        );
      if (types === g.slice(at)) throw new Error('release-signing: release build type not found');
      g = g.slice(0, at) + types;
    }
    cfg.modResults.contents = g;
    return cfg;
  });
};
