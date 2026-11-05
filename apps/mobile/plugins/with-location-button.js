const { withProjectBuildGradle, withGradleProperties, withDangerousMod } = require('expo/config-plugins');
module.exports = function withLocationButton(config) {
  config = withDangerousMod(config, ['android', async c => {
    const fs = require('fs');
    const path = require('path');
    const core = path.dirname(require.resolve('expo-modules-core/package.json', {paths:[c.modRequest.projectRoot]}));
    const file = path.join(core, 'expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt');
    const source = fs.readFileSync(file, 'utf8');
    const legacy = '    this@defaultConfig.targetSdk = targetSdk';
    const marker = '    // AGP 9.1: targetSdk belongs to the application, not libraries.';
    if (!source.includes(legacy) && !source.includes(marker)) throw new Error('Expo library SDK compatibility patch needs review');
    fs.writeFileSync(file, source.replace(legacy, marker));
    const rn = path.dirname(require.resolve('@react-native/gradle-plugin/package.json', {paths:[c.modRequest.projectRoot]}));
    const rnFile = path.join(rn,'react-native-gradle-plugin/src/main/kotlin/com/facebook/react/utils/AgpConfiguratorUtils.kt');
    const rnSource = fs.readFileSync(rnFile,'utf8');
    let patched = rnSource;
    for (const [method, key] of [
      ['configureBuildConfigFieldsForLibraries','courtsLocationBuildConfigRegistered'],
      ['configureNamespaceForLibraries','courtsLocationNamespaceRegistered'],
    ]) {
      const signature = `  fun ${method}(appProject: Project) {`;
      const guard = `\n    val rootExtras = appProject.rootProject.extensions.extraProperties\n    if (rootExtras.has("${key}")) return\n    rootExtras.set("${key}", true)`;
      if (!patched.includes(key)) {
        if (!patched.includes(signature)) throw new Error('React Native AGP compatibility patch needs review');
        patched = patched.replace(signature,signature+guard);
      }
    }
    fs.writeFileSync(rnFile,patched);
    return c;
  }]);
  config = withGradleProperties(config, c => {
    const values = { 'android.compileSdkVersion': '37', 'android.builtInKotlin': 'false', 'android.newDsl': 'false', 'android.sourceset.disallowProvider': 'false' };
    c.modResults = c.modResults.filter(p => p.type !== 'property' || !(p.key in values));
    for (const [key, value] of Object.entries(values)) c.modResults.push({type:'property', key, value});
    return c;
  });
  return withProjectBuildGradle(config, c => {
    // Official LocationButton alpha01 requires AGP >= 9.1 and compile SDK 37.
    c.modResults.contents = c.modResults.contents.replace("classpath('com.android.tools.build:gradle')", "classpath('com.android.tools.build:gradle:9.1.0')");
    return c;
  });
};
