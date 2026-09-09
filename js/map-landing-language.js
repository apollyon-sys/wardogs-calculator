'use strict';

(() => {
    const select = document.querySelector(
        '[data-map-language-select]'
    );

    if (!select) return;

    select.addEventListener('change', () => {
        const option = select.selectedOptions[0];
        const target = option?.value;

        if (!target) return;

        try {
            localStorage.setItem(
                'wardogs-language',
                option.dataset.language || 'en'
            );
        } catch {
            // Navigation still works when storage is unavailable.
        }

        window.location.assign(
            new URL(target, document.baseURI).href
        );
    });
})();
