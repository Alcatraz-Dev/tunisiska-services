const { withPodfile } = require("@expo/config-plugins");

/**
 * Podfile fixes that make a clean `expo prebuild` produce a buildable project.
 *
 * Two problems are addressed. Both are pre-existing issues that were only
 * ever fixed by hand-editing the gitignored `ios/` directory.
 *
 * 1. **Modular headers**
 *
 *    `@react-native-google-signin/google-signin` pulls in `GoogleSignIn`,
 *    which depends on the Swift pods `AppCheckCore`, `GoogleUtilities` and
 *    `RecaptchaInterop`. Those pods do not define modules, so CocoaPods
 *    refuses to integrate them as static libraries:
 *
 *      The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 *      `RecaptchaInterop`, which do not define modules.
 *
 *    `use_modular_headers!` opts those pods into generating module maps.
 *
 * 2. **Deployment targets**
 *
 *    A number of third-party podspecs still declare deployment targets below
 *    iOS 15 (9.0, 11.0, 12.0, 13.4 …). Xcode 27 refuses to build a target
 *    whose deployment target is below 15.0:
 *
 *      The iOS Simulator deployment target 'IPHONEOS_DEPLOYMENT_TARGET' is set
 *      to 12.0, but the range of supported deployment target versions is
 *      15.0 to 27.1.x.
 *
 *    The `post_install` hook raises every pod to the app's own minimum.
 */
module.exports = function withPodfileFixes(config) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // ── 1. Modular headers ──────────────────────────────────────────
    if (!contents.includes("use_modular_headers!")) {
      const anchor = "target '";
      const index = contents.indexOf(anchor);
      if (index === -1) {
        console.warn(
          "[withPodfileFixes] Could not find the Podfile target block — skipping the modular headers fix.",
        );
      } else {
        contents = `${contents.slice(0, index)}use_modular_headers!\n\n${contents.slice(index)}`;
      }
    }

    // ── 2. Pod deployment targets ───────────────────────────────────
    if (!contents.includes("TunisiskaPodDeploymentTargets")) {
      const marker = "  post_install do |installer|";
      const index = contents.indexOf(marker);

      if (index === -1) {
        console.warn(
          "[withPodfileFixes] Could not find the Podfile post_install hook — skipping the deployment target fix.",
        );
      } else {
        const hook = [
          marker,
          "    # TunisiskaPodDeploymentTargets",
          "    # Raise every pod to the app's minimum deployment target. A number of",
          "    # third-party podspecs still declare iOS 9-13, which Xcode 27 refuses",
          "    # to build.",
          "    app_deployment_target = '16.4'",
          "    installer.pods_project.targets.each do |target|",
          "      target.build_configurations.each do |config|",
          "        current = config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']",
          "        if current.nil? || current.to_f < app_deployment_target.to_f",
          "          config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = app_deployment_target",
          "        end",
          "        if target.respond_to?(:product_type) and target.product_type == 'com.apple.product-type.bundle'",
          "          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'",
          "        end",
          "      end",
          "    end",
          "    installer.target_installation_results.pod_target_installation_results.each do |pod_name, target_installation_result|",
          "      target_installation_result.resource_bundle_targets.each do |resource_bundle_target|",
          "        resource_bundle_target.build_configurations.each do |config|",
          "          config.build_settings['CODE_SIGNING_ALLOWED'] = 'NO'",
          "        end",
          "      end",
          "    end",
        ].join("\n");

        contents = `${contents.slice(0, index)}${hook}\n${contents.slice(index + marker.length)}`;
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
};
