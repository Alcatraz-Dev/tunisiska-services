const { withXcodeProject, withInfoPlist, withEntitlementsPlist, withPodfileProperties } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Tunisiska Live Activity — Expo config plugin.
 *
 * Adds a **real** WidgetKit extension to the iOS app so ActivityKit Live
 * Activities can be shown on the Lock Screen and in the Dynamic Island.
 *
 * The plugin is required because `ios/` is not tracked in git — everything it
 * does is reproduced by `expo prebuild`, so the native project always matches
 * the committed sources in `modules/tunisiska-live-activity/`.
 *
 * What it does:
 *   1. Raises the iOS deployment target to 16.2 (ActivityKit requirement).
 *   2. Copies the widget sources into the generated iOS project.
 *   3. Adds a Widget Extension target to the Xcode project.
 *   4. Embeds the extension into the app and adds the target dependency.
 *   5. Sets `NSSupportsLiveActivities` on the app.
 */

const TARGET_NAME = "TunisiskaLiveActivityWidget";
const BUNDLE_ID_SUFFIX = ".NextDeparture";
const DEPLOYMENT_TARGET = "16.2";
const GROUP_NAME = "Embed App Extensions";

/** Resolve the project root (the folder holding package.json). */
function getProjectRoot(config) {
  return config?._internal?.projectRoot ?? path.resolve(__dirname, "..");
}

/**
 * Copy the widget sources into the generated iOS project.
 *
 * The sources live in `modules/tunisiska-live-activity/widget` and are copied
 * verbatim, so they stay reviewable in git.
 */
function copyWidgetSources(projectRoot, iosRoot) {
  const source = path.join(
    projectRoot,
    "modules",
    "tunisiska-live-activity",
    "widget",
  );
  const destination = path.join(iosRoot, TARGET_NAME);

  if (!fs.existsSync(source)) {
    throw new Error(
      `[withLiveActivities] Widget sources are missing at ${source}. ` +
        "Run `expo prebuild` from a clean checkout of the repository.",
    );
  }

  fs.mkdirSync(destination, { recursive: true });

  for (const file of fs.readdirSync(source)) {
    fs.copyFileSync(path.join(source, file), path.join(destination, file));
  }

  // The attributes type must be compiled into the widget target as well as
  // the app. The app gets it through the Expo module pod; the widget gets a
  // copy here. Both declare the same `activityType`, which is how ActivityKit
  // matches a running activity to the widget that renders it.
  const attributesSource = path.join(
    projectRoot,
    "modules",
    "tunisiska-live-activity",
    "ios",
    "NextDepartureAttributes.swift",
  );
  if (fs.existsSync(attributesSource)) {
    fs.copyFileSync(
      attributesSource,
      path.join(destination, "NextDepartureAttributes.swift"),
    );
  }

  fs.writeFileSync(
    path.join(destination, `${TARGET_NAME}.entitlements`),
    `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict><key>com.apple.security.application-groups</key><array><string>group.com.alcatrazdev.tunisiskaservices</string></array></dict></plist>\n`,
  );

  return destination;
}

/**
 * Register a file in a build phase.
 *
 * `addFile` returns a file reference without a build-file uuid, so the
 * `PBXBuildFile` entry has to be created explicitly.
 */
function addBuildFile(project, fileRefUuid, comment) {
  const uuid = project.generateUuid();
  project.hash.project.objects.PBXBuildFile[uuid] = {
    isa: "PBXBuildFile",
    fileRef: fileRefUuid,
  };
  project.hash.project.objects.PBXBuildFile[`${uuid}_comment`] = comment;
  return uuid;
}

/**
 * Add a system framework to the Frameworks group.
 *
 * `addFile` returns `null` when the framework is already referenced, which is
 * the case on a re-run — so the existing reference is looked up instead.
 */
function addFramework(project, name, frameworksGroup) {
  const added = project.addFile(name, frameworksGroup);
  if (added) return added.fileRef;

  const references = project.pbxFileReferenceSection();
  const key = Object.keys(references).find((candidate) => {
    if (candidate.endsWith("_comment")) return false;
    const reference = references[candidate];
    return reference?.path === name || reference?.name === name;
  });

  return key ?? null;
}

/**
 * Add the Widget Extension target to the Xcode project.
 */
function addWidgetTarget(projectRoot, project) {
  const iosRoot = path.join(projectRoot, "ios");
  const widgetDir = copyWidgetSources(projectRoot, iosRoot);

  const appTargetUuid = project.getFirstTarget().uuid;

  // The widget sources are always refreshed above. The *project structure*
  // only needs to be created once — adding it again would duplicate the
  // group and the file references, which Xcode rejects as malformed.
  if (project.findTargetKey(TARGET_NAME)) {
    // Keep an already generated extension in sync when new widget source
    // files are added by this plugin in a later prebuild.
    const nativeTargets = project.pbxNativeTargetSection();
    const targetKey = Object.keys(nativeTargets).find((key) => !key.endsWith("_comment") && nativeTargets[key].name === TARGET_NAME);
    const target = targetKey ? nativeTargets[targetKey] : null;
    const configurationList = target?.buildConfigurationList
      ? project.pbxXCConfigurationList()[target.buildConfigurationList]
      : null;
    for (const configuration of configurationList?.buildConfigurations ?? []) {
      const buildConfiguration = project.pbxXCBuildConfigurationSection()[configuration.value];
      if (buildConfiguration?.buildSettings) {
        buildConfiguration.buildSettings.CODE_SIGN_ENTITLEMENTS = `"${TARGET_NAME}/${TARGET_NAME}.entitlements"`;
        buildConfiguration.buildSettings.CODE_SIGN_STYLE = "Automatic";
        buildConfiguration.buildSettings.DEVELOPMENT_TEAM = '"8436MWNDM3"';
        delete buildConfiguration.buildSettings.CODE_SIGNING_ALLOWED;
        delete buildConfiguration.buildSettings.CODE_SIGNING_REQUIRED;
      }
    }
    const projectSection = project.pbxProjectSection();
    const firstProject = project.getFirstProject().uuid;
    if (projectSection?.[firstProject]) {
      if (!projectSection[firstProject].attributes) projectSection[firstProject].attributes = {};
      if (!projectSection[firstProject].attributes.TargetAttributes) projectSection[firstProject].attributes.TargetAttributes = {};
      const targetUuidKey = target?.uuid || targetKey;
      if (targetUuidKey) {
        projectSection[firstProject].attributes.TargetAttributes[targetUuidKey] = {
          CreatedOnToolsVersion: "15.0",
          LastSwiftMigration: 1500,
          DevelopmentTeam: "8436MWNDM3",
          ProvisioningStyle: "Automatic",
        };
      }
    }
    const groups = project.hash.project.objects.PBXGroup ?? {};
    const widgetGroupKey = Object.keys(groups).find((key) => !key.endsWith("_comment") && groups[key].name === TARGET_NAME);
    const widgetGroup = widgetGroupKey ? groups[widgetGroupKey] : null;
    const sourcePhase = target?.buildPhases?.map((phase) => project.hash.project.objects.PBXSourcesBuildPhase?.[phase.value]).find(Boolean);
    if (widgetGroup && sourcePhase) {
      for (const fileName of ["NextDepartureHomeWidget.swift"]) {
        const alreadyAdded = Object.keys(project.pbxFileReferenceSection()).some((key) => !key.endsWith("_comment") && project.pbxFileReferenceSection()[key]?.path === fileName);
        if (alreadyAdded) continue;
        const fileRef = project.generateUuid();
        project.hash.project.objects.PBXFileReference[fileRef] = {
          isa: "PBXFileReference",
          lastKnownFileType: "sourcecode.swift",
          path: fileName,
          sourceTree: "<group>",
        };
        project.hash.project.objects.PBXFileReference[`${fileRef}_comment`] = fileName;
        widgetGroup.children.push({ value: fileRef, comment: fileName });
        sourcePhase.files.push({ value: addBuildFile(project, fileRef, `${fileName} in Sources`), comment: `${fileName} in Sources` });
      }
    }
    console.log(
      `[withLiveActivities] ${TARGET_NAME} already exists — keeping the existing target.`,
    );
    return null;
  }
  const appBundleId =
    project.pbxXCBuildConfigurationSection()[
      Object.keys(project.pbxXCBuildConfigurationSection()).find(
        (key) =>
          !key.endsWith("_comment") &&
          project.pbxXCBuildConfigurationSection()[key].buildSettings
            ?.PRODUCT_BUNDLE_IDENTIFIER,
      )
    ]?.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER ?? "com.tunisiska.mega";

  const bundleId = `${String(appBundleId).replace(/"/g, "")}${BUNDLE_ID_SUFFIX}`;

  // ── Product file (the .appex) ─────────────────────────────────────
  // `explicitFileType` makes the Xcode library append the `.appex`
  // extension itself, so the target name is passed without it.
  const productFile = project.addProductFile(TARGET_NAME, {
    explicitFileType: "wrapper.app-extension",
    target: appTargetUuid,
  });

  // ── Sources ───────────────────────────────────────────────────────
  const swiftFileNames = [
    "NextDepartureWidget.swift",
    "NextDepartureHomeWidget.swift",
    "NextDepartureWidgetBundle.swift",
    "NextDepartureAttributes.swift",
  ];

  const group = project.addPbxGroup(
    swiftFileNames,
    TARGET_NAME,
    TARGET_NAME,
    '"SOURCE_ROOT"',
  );

  // Attach the group to the root group of the project.
  const groups = project.hash.project.objects.PBXGroup ?? {};
  Object.keys(groups).forEach((key) => {
    if (key.endsWith("_comment")) return;
    if (groups[key].name === undefined && groups[key].path === undefined) {
      project.addToPbxGroup(group.uuid, key);
    }
  });

  // ── Build configuration list ───────────────────────────────────────
  const commonBuildSettings = {
    PRODUCT_NAME: `"$(TARGET_NAME)"`,
    PRODUCT_BUNDLE_IDENTIFIER: `"${bundleId}"`,
    INFOPLIST_FILE: `"${TARGET_NAME}/Info.plist"`,
    CODE_SIGN_ENTITLEMENTS: `"${TARGET_NAME}/${TARGET_NAME}.entitlements"`,
    IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
    SWIFT_VERSION: "5.9",
    TARGETED_DEVICE_FAMILY: '"1,2"',
    SKIP_INSTALL: "YES",
    CODE_SIGN_STYLE: "Automatic",
    DEVELOPMENT_TEAM: '"8436MWNDM3"',
    CURRENT_PROJECT_VERSION: "1",
    MARKETING_VERSION: "1.0",
    GENERATE_INFOPLIST_FILE: "NO",
    LD_RUNPATH_SEARCH_PATHS:
      '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
    ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: "AccentColor",
    ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: "WidgetBackground",
  };

  const configurationList = project.addXCConfigurationList(
    [
      {
        name: "Debug",
        isa: "XCBuildConfiguration",
        buildSettings: {
          ...commonBuildSettings,
          SWIFT_OPTIMIZATION_LEVEL: '"-Onone"',
        },
      },
      {
        name: "Release",
        isa: "XCBuildConfiguration",
        buildSettings: {
          ...commonBuildSettings,
          SWIFT_OPTIMIZATION_LEVEL: '"-O"',
        },
      },
    ],
    "Release",
    `Build configuration list for PBXNativeTarget "${TARGET_NAME}"`,
  );

  // ── Native target ──────────────────────────────────────────────────
  const targetUuid = project.generateUuid();
  const nativeTarget = {
    isa: "PBXNativeTarget",
    name: TARGET_NAME,
    productName: TARGET_NAME,
    productReference: productFile.fileRef,
    productType: '"com.apple.product-type.app-extension"',
    buildConfigurationList: configurationList.uuid,
    buildPhases: [],
    buildRules: [],
    dependencies: [],
  };

  project.addToPbxNativeTargetSection({
    uuid: targetUuid,
    pbxNativeTarget: nativeTarget,
  });

  // Sources build phase — the Swift files.
  project.addBuildPhase(
    swiftFileNames,
    "PBXSourcesBuildPhase",
    "Sources",
    targetUuid,
  );

  // Frameworks build phase — WidgetKit and SwiftUI.
  const frameworksGroup = project.findPBXGroupKey({ name: "Frameworks" });
  const widgetKitRef = addFramework(project, "WidgetKit.framework", frameworksGroup);
  const swiftUIRef = addFramework(project, "SwiftUI.framework", frameworksGroup);
  project.addBuildPhase(
    [],
    "PBXFrameworksBuildPhase",
    "Frameworks",
    targetUuid,
  );
  const frameworksPhase = project.buildPhaseObject(
    "PBXFrameworksBuildPhase",
    "Frameworks",
    targetUuid,
  );
  if (frameworksPhase) {
    if (widgetKitRef) {
      frameworksPhase.files.push({
        value: addBuildFile(project, widgetKitRef, "WidgetKit.framework"),
        comment: "WidgetKit.framework",
      });
    }
    if (swiftUIRef) {
      frameworksPhase.files.push({
        value: addBuildFile(project, swiftUIRef, "SwiftUI.framework"),
        comment: "SwiftUI.framework",
      });
    }
  }

  // ── Register the target with the project ───────────────────────────
  project.addToPbxProjectSection({
    uuid: targetUuid,
    pbxNativeTarget: nativeTarget,
  });

  const projectSection = project.pbxProjectSection();
  const firstProject = project.getFirstProject().uuid;
  if (!projectSection[firstProject].attributes) {
    projectSection[firstProject].attributes = {};
  }
  if (!projectSection[firstProject].attributes.TargetAttributes) {
    projectSection[firstProject].attributes.TargetAttributes = {};
  }
  projectSection[firstProject].attributes.TargetAttributes[targetUuid] = {
    CreatedOnToolsVersion: "15.0",
    LastSwiftMigration: 1500,
    DevelopmentTeam: "8436MWNDM3",
    ProvisioningStyle: "Automatic",
  };

  // ── App depends on the extension ───────────────────────────────────
  // `xcode`'s addTargetDependency only writes into existing
  // PBXContainerItemProxy / PBXTargetDependency sections; a freshly generated
  // React Native project has neither, and the call then silently does nothing.
  // Without the dependency Xcode never builds the appex, so the app ships
  // without the Live Activity widget and no Dynamic Island ever appears.
  ensureDependencySections(project);
  project.addTargetDependency(appTargetUuid, [targetUuid]);

  // ── Embed the extension in the app ─────────────────────────────────
  project.addBuildPhase(
    [],
    "PBXCopyFilesBuildPhase",
    GROUP_NAME,
    appTargetUuid,
    "app_extension",
    '""',
  );

  const embedPhase = project.buildPhaseObject(
    "PBXCopyFilesBuildPhase",
    GROUP_NAME,
    appTargetUuid,
  );

  if (embedPhase) {
    embedPhase.files.push({
      value: productFile.uuid,
      comment: `${productFile.basename} in ${GROUP_NAME}`,
    });
  }

  project.addToPbxBuildFileSection(productFile);

  // Flag the build file so Xcode strips the headers when copying.
  const buildFile = project.pbxBuildFileSection()[productFile.uuid];
  if (buildFile) {
    buildFile.settings = { ATTRIBUTES: ["RemoveHeadersOnCopy"] };
  }

  return targetUuid;
}

/**
 * Create the dependency sections when the project does not have them yet.
 *
 * `PBXTargetDependency` and `PBXContainerItemProxy` are only written by Xcode
 * once a project has a target dependency, so a CNG-generated project starts
 * without them and `addTargetDependency` becomes a no-op.
 */
function ensureDependencySections(project) {
  const objects = project.hash?.project?.objects;
  if (!objects) return;
  if (!objects.PBXContainerItemProxy) objects.PBXContainerItemProxy = {};
  if (!objects.PBXTargetDependency) objects.PBXTargetDependency = {};
}

/** Raise the deployment target of every build configuration. */
function bumpDeploymentTarget(project) {
  const configurations = project.pbxXCBuildConfigurationSection();
  Object.keys(configurations).forEach((key) => {
    if (key.endsWith("_comment")) return;
    const configuration = configurations[key];
    if (configuration?.buildSettings?.IPHONEOS_DEPLOYMENT_TARGET) {
      configuration.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = DEPLOYMENT_TARGET;
    }
  });
}

module.exports = function withLiveActivities(config) {
  const projectRoot = getProjectRoot(config);

  // ── App Info.plist: declare Live Activity support ──────────────────
  config = withInfoPlist(config, (cfg) => {
    if (!cfg.modResults.NSSupportsLiveActivities) {
      cfg.modResults.NSSupportsLiveActivities = true;
    }
    return cfg;
  });

  config = withEntitlementsPlist(config, (cfg) => {
    const group = "group.com.alcatrazdev.tunisiskaservices";
    const groups = cfg.modResults["com.apple.security.application-groups"] ?? [];
    if (!groups.includes(group)) groups.push(group);
    cfg.modResults["com.apple.security.application-groups"] = groups;
    return cfg;
  });

  // CocoaPods filters out modules whose podspec requires a newer iOS version
  // than the Podfile platform. Keep that platform aligned with ActivityKit.
  config = withPodfileProperties(config, (cfg) => {
    cfg.modResults["ios.deploymentTarget"] = DEPLOYMENT_TARGET;
    return cfg;
  });

  // ── Xcode project: widget extension target ─────────────────────────
  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    bumpDeploymentTarget(project);
    addWidgetTarget(projectRoot, project);
    return cfg;
  });

  return config;
};
