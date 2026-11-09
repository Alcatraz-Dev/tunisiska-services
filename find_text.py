import os, re
core = set()
with open('app/hooks/useTranslation.ts', 'r') as f:
    content = f.read()
for m in re.finditer(r'"([^"]+)"\s*:', content):
    core.add(m.group(1))

for root, dirs, filenames in os.walk('app'):
    for fn in filenames:
        if fn.endswith('.tsx') or fn.endswith('.ts'):
            path = os.path.join(root, fn)
            with open(path, 'r', encoding='utf-8') as f:
                text = f.read()
            for m in re.finditer(r'"([^"]{4,})"', text):
                s = m.group(1)
                if s.startswith('@') or s.startswith('./') or s.startswith('../') or s.startswith('/') or s.startswith('http') or s.startswith('tunisiska') or s.startswith('expo.') or s.startswith('react') or s.startswith('fontFamily') or s.startswith('sans') or s.startswith('system') or 'layout_animated' in s.lower() or 'icon' in s.lower() or 'chevron' in s.lower() or s.startswith('app/') or s.startswith('assets/') or s.startswith('icon-') or s in ['row', 'center', 'flex', 'wrap_content', 'match_parent', 'center_vertical', 'end', 'start', 'leftToRight', 'ltr', 'match_content', 'vertical', 'horizontal', 'bold', 'rounded', 'monospacedDigit', 'lineLimit', 'numberOfLines', 'maximumWidth', 'minimumScaleFactor', 'fontWeight', 'fontSize', 'fontFamily', 'fontStyle', 'fontDesign', 'letterSpacing', 'tracking', 'backgroundColor', 'textColor', 'borderColor', 'shadowColor', 'borderRadius', 'padding', 'margin', 'marginTop', 'marginBottom', 'marginStart', 'marginEnd', 'marginHorizontal', 'marginVertical', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'paddingHorizontal', 'paddingVertical', 'alignItems', 'justifyContent', 'flexDirection', 'alignSelf', 'alignContent', 'flexWrap', 'overflow', 'position', 'top', 'bottom', 'left', 'right', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'zIndex', 'opacity', 'elevation', 'shadowOffset', 'shadowOpacity', 'shadowRadius', 'background', 'border', 'borderWidth', 'borderStyle', 'borderTopWidth', 'borderBottomWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius', 'borderColor', 'dark', 'light', 'autom', 'darkest', 'headers', 'bottomNavigations', 'tabBar', 'tabBarLabel', 'headerShown', 'headerBackTitle', 'headerTitle', 'drawerLabel', 'drawerIcon', 'drawerType', 'presentation', 'animation', 'animationEnabled', 'gestureEnabled', 'fullScreenGestureEnabled', 'presentationStyle', 'statusBarAnimation', 'statusBarTranslucent', 'statusBarHidden', 'statusBarColor', 'statusBarStyle', 'navigationBarColor', 'navigationBarHidden', 'navigationBarTranslucent', 'navigationBarBorderColor', 'contentStyle', 'safeAreaInsets', 'headerTransparent', 'headerBlurEffect', 'headerBackground', 'headerShadowVisible', 'headerTitleAlign', 'headerTitleStyle', 'headerTitleContainerStyle', 'headerBackButtonMenuEnabled', 'headerBackVisible', 'headerBackAccessibilityLabel', 'headerBackTestID', 'headerBackImageSource', 'headerBackTitleVisible', 'headerBackTitleStyle', 'headerBackTitleContainerStyle', 'headerRight', 'headerLeft', 'headerPressColor', 'headerPressOpacity', 'headerStatusBarHeight', 'headerLargeTitle', 'headerLargeTitleStyle', 'headerLargeTitleContainerStyle', 'headerLargeTitleShadowVisible', 'headerSearchBarOptions', 'headerBackgroundContainerStyle', 'headerBlurEffect', 'headerTransparent', 'sheetPresentation', 'sheetAllowedDetents', 'sheetCornerRadius', 'sheetGrabberVisible', 'sheetFlipEnabled', 'sheetInitialDetent', 'sheetLargestUndimmedDetent', 'sheetExpandsWhenScrolledToEdge', 'sheetPresentationController', 'sheetPresentationController', 'sheetAllowedDetents', 'sheetCornerRadius', 'sheetGrabberVisible', 'sheetFlipEnabled', 'sheetInitialDetent', 'sheetLargestUndimmedDetent', 'sheetExpandsWhenScrolledToEdge']:
                continue
            if s in core:
                continue
            # Skip if nearby useTranslationText
            # For speed just save top 10 per file
            pass
