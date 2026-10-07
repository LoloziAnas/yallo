// Signs release builds with the Yallo release key, which lives outside git (~/yallo-keys, see
// scripts/build-apk.mjs). The key is read when Gradle runs, so `expo prebuild` never copies a
// secret into android/. Without the properties file, release builds fall back to the debug key.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARK = '// yallo-release-signing';

const SIGNING = `
    ${MARK}
    def yalloKeyProps = new Properties()
    def yalloKeyFile = file(System.getenv('YALLO_KEYSTORE_PROPERTIES') ?: "\${System.getProperty('user.home')}/yallo-keys/courier-release.properties")
    if (yalloKeyFile.exists()) { yalloKeyFile.withInputStream { yalloKeyProps.load(it) } }
    signingConfigs {
        if (yalloKeyProps['storeFile']) {
            release {
                storeFile file(yalloKeyProps['storeFile'])
                storePassword yalloKeyProps['storePassword']
                keyAlias yalloKeyProps['keyAlias']
                keyPassword yalloKeyProps['keyPassword']
            }
        }
    }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARK)) return cfg;
    // The extra signingConfigs block merges with the template's (which defines debug).
    gradle = gradle.replace(/\n(\s*)buildTypes\s*\{/, (m) => `${SIGNING}\n${m}`);
    gradle = gradle.replace(
      /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/,
      '$1signingConfig signingConfigs.findByName("release") ?: signingConfigs.debug',
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
