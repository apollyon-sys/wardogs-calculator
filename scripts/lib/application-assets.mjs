export const LAYOUT_SCRIPT_FILES = Object.freeze([
    'js/ui/layout/state.js',
    'js/ui/layout/accessibility.js',
    'js/ui/layout/sidebar.js',
    'js/ui/layout/mobile-menu.js',
    'js/ui/layout/mobile-warning.js',
    'js/ui/layout/saved-targets-panel.js',
    'js/ui/layout/coordinator.js'
]);

export const MAP_TOOL_SCRIPT_FILES = Object.freeze([
    'js/map/tools/state.js',
    'js/map/tools/controls.js',
    'js/map/tools/interactions.js',
    'js/map/tools/rendering.js'
]);

const COMMON_SCRIPT_FILES = Object.freeze([
    'js/core/core.js',
    'js/core/resources.js',
    'js/core/config.js',
    'js/core/analytics.js',
    'js/core/file-transfer.js',
    'js/ui/i18n.js',
    'js/ui/theme.js',
    'js/ui/footer.js',
    ...LAYOUT_SCRIPT_FILES,
    'js/features/saved-targets.js',
    'js/features/motd.js',
    'js/features/weapons.js',
    'js/map/assets.js',
    'js/map/maps.js',
    'js/map/map-view.js',
    'js/map/tiles.js',
    'js/map/contours.js',
    'js/map/overlays.js',
    ...MAP_TOOL_SCRIPT_FILES,
    'js/map/grid.js',
    'js/map/renderer.js',
    'js/features/coordinates.js',
    'js/features/point-locks.js',
    'js/features/fire-adjustment.js',
    'js/features/results.js',
    'js/ui/inputs.js',
    'js/ui/cursor.js',
    'js/events.js'
]);

export function applicationScriptFiles({ mobile = false } = {}) {
    const files = [...COMMON_SCRIPT_FILES];

    if (mobile) {
        files.push('js/mobile/mobile.js');
    } else {
        const mapViewIndex = files.indexOf('js/map/map-view.js');
        files.splice(mapViewIndex + 1, 0, 'js/map/camera-keys.js');
    }

    files.push('js/main.js');
    return files;
}

export const DESKTOP_SCRIPT_FILES = Object.freeze(
    applicationScriptFiles()
);

export const MOBILE_SCRIPT_FILES = Object.freeze(
    applicationScriptFiles({ mobile: true })
);
