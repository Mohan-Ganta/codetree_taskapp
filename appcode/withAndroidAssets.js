const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withAndroidAssets = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      // Source path in your project's assets folder
      const sourceFile = path.join(config.modRequest.projectRoot, 'assets', 'adi-registration.properties');
      
      // Target path in the native Android assets folder
      const targetDir = path.join(platformProjectRoot, 'app', 'src', 'main', 'assets');
      const targetFile = path.join(targetDir, 'adi-registration.properties');

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy file
      if (fs.existsSync(sourceFile)) {
        fs.copyFileSync(sourceFile, targetFile);
        console.log('✅ Successfully copied adi-registration.properties to Android native assets');
      } else {
        console.error('❌ Source file not found:', sourceFile);
      }

      return config;
    },
  ]);
};

module.exports = withAndroidAssets;
