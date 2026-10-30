/* eslint-disable @typescript-eslint/no-require-imports */
const {
  withAppBuildGradle,
  withGradleProperties,
} = require('expo/config-plugins');

const RELEASE_OPTIMIZATION_PROPERTIES = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
  'android.r8.optimizedResourceShrinking': 'true',
};

function withReleaseOptimizationProperties(config) {
  return withGradleProperties(config, (gradleConfig) => {
    const propertyNames = new Set(Object.keys(RELEASE_OPTIMIZATION_PROPERTIES));

    gradleConfig.modResults = gradleConfig.modResults.filter(
      (item) => item.type !== 'property' || !propertyNames.has(item.key),
    );

    for (const [key, value] of Object.entries(RELEASE_OPTIMIZATION_PROPERTIES)) {
      gradleConfig.modResults.push({ type: 'property', key, value });
    }

    return gradleConfig;
  });
}

function withOptimizedProguardDefaults(config) {
  return withAppBuildGradle(config, (gradleConfig) => {
    if (gradleConfig.modResults.language !== 'groovy') {
      throw new Error(
        'Android release optimization expects a Groovy app/build.gradle file.',
      );
    }

    const originalContents = gradleConfig.modResults.contents;
    const optimizedContents = originalContents.replace(
      /getDefaultProguardFile\((["'])proguard-android(?:-optimize)?\.txt\1\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")',
    );

    if (optimizedContents === originalContents && !originalContents.includes('proguard-android-optimize.txt')) {
      throw new Error(
        'Unable to find the default ProGuard configuration in android/app/build.gradle.',
      );
    }

    gradleConfig.modResults.contents = optimizedContents;
    return gradleConfig;
  });
}

module.exports = function withAndroidReleaseOptimization(config) {
  config = withReleaseOptimizationProperties(config);
  config = withOptimizedProguardDefaults(config);
  return config;
};
