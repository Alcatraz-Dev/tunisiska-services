const { withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function withKlarnaRepo(config) {
  console.log('Applying withKlarnaRepo plugin...');
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const klarnaRepo = `maven { url 'https://x.klarnacdn.net/mobile-sdk/' }`;
      if (!config.modResults.contents.includes('x.klarnacdn.net')) {
        config.modResults.contents = config.modResults.contents.replace(
          /maven\s*\{\s*url\s+['"]https:\/\/www\.jitpack\.io['"]\s*\}/,
          `maven { url 'https://www.jitpack.io' }\n        ${klarnaRepo}`
        );
      }
    }
    return config;
  });
};
