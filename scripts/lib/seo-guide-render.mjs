function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

const ICONS = Object.freeze({
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"/>',
    start: '<circle cx="12" cy="12" r="8"/><path d="m14.8 9.2-1.7 3.9-3.9 1.7 1.7-3.9Z"/>',
    weapons: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    maps: '<path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3Z"/><path d="M8 3v15M16 6v15"/>',
    tools: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="15" r="3"/><path d="M10.5 9.5 13.5 13M3 20c.7-3.2 2.3-5 5-5M21 7c-.7 3.2-2.3 5-5 5"/>',
    faq: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.1 2.2c-.9.4-.9 1-.9 1.8M12 17h.01"/>',
    arrow: '<path d="m9 18 6-6-6-6"/>'
});

function icon(name, className = 'seo-icon') {
    return [
        `<span aria-hidden="true" class="${className}">`,
        `<svg viewBox="0 0 24 24">${ICONS[name] || ICONS.book}</svg>`,
        '</span>'
    ].join('');
}

function guideCategories(guide) {
    return {
        start: guide?.categories?.start || guide?.navLabel || 'Getting started',
        weapons: guide?.categories?.weapons || 'Weapons and firing',
        maps: guide?.categories?.maps || 'Tactical maps',
        tools: guide?.categories?.tools || guide?.featuresHeading || 'Team tools',
        faq: guide?.categories?.faq || 'FAQ'
    };
}

function renderHero(copy) {
    const guide = copy.guide;
    const title = copy.cluster?.heading || copy.heading;
    const lead = copy.cluster?.intro || copy.intro;

    return [
        '<header class="seo-guide-hero">',
        icon('book', 'seo-guide-hero-icon'),
        '<div>',
        `<span class="seo-guide-eyebrow">${escapeHtml(guide.navLabel)}</span>`,
        `<h2 id="wardogs-artillery-calculator">${escapeHtml(title)}</h2>`,
        `<p>${escapeHtml(lead)}</p>`,
        '</div>',
        '</header>'
    ].join('\n');
}

function renderCategoryNavigation(guide) {
    const labels = guideCategories(guide);
    const links = [
        ['guide-getting-started', 'start', labels.start],
        ['guide-weapons', 'weapons', labels.weapons],
        ['guide-maps', 'maps', labels.maps],
        ['guide-tools', 'tools', labels.tools],
        ['wardogs-calculator-faq', 'faq', labels.faq]
    ];

    return [
        `<nav aria-label="${escapeHtml(guide.navLabel)}" class="seo-category-nav">`,
        ...links.map(([target, iconName, label]) => [
            `<a class="seo-category-link" href="#${target}">`,
            icon(iconName),
            `<span>${escapeHtml(label)}</span>`,
            icon('arrow', 'seo-category-arrow'),
            '</a>'
        ].join('')),
        '</nav>'
    ].join('\n');
}

function renderCategoryHeader(id, iconName, title) {
    return [
        `<div class="seo-category-heading" id="${escapeHtml(id)}">`,
        icon(iconName),
        `<h3>${escapeHtml(title)}</h3>`,
        '</div>'
    ].join('');
}

function renderGettingStarted(guide) {
    const labels = guideCategories(guide);
    const steps = guide.steps
        .map((step, index) => [
            '<li class="seo-step-card">',
            `<span aria-hidden="true" class="seo-step-number">${index + 1}</span>`,
            '<div>',
            `<h4>${escapeHtml(step.heading.replace(/^\s*\d+[.)]?\s*/, ''))}</h4>`,
            `<p>${escapeHtml(step.body)}</p>`,
            '</div>',
            '</li>'
        ].join('\n'))
        .join('\n');

    const tips = Array.isArray(guide.tips) && guide.tips.length
        ? [
            '<aside class="seo-tips-card">',
            `<h4>${escapeHtml(guide.tipsHeading)}</h4>`,
            '<ul>',
            ...guide.tips.map(tip => `<li>${escapeHtml(tip)}</li>`),
            '</ul>',
            '</aside>'
        ].join('\n')
        : '';

    return [
        '<section class="seo-category-section">',
        renderCategoryHeader('guide-getting-started', 'start', labels.start),
        `<p class="seo-category-lead">${escapeHtml(guide.intro)}</p>`,
        '<ol class="seo-step-grid">',
        steps,
        '</ol>',
        tips,
        '</section>'
    ].join('\n');
}

function mapHrefFromText(value) {
    const match = String(value).match(/\b(Bakurani|Ozeti|Zestafona)\b/i);
    return match
        ? `maps/${match[1].toLowerCase()}/`
        : null;
}

function renderResourceCard(resource, iconName) {
    const href = resource.href || null;
    const heading = href
        ? [
            `<a href="${escapeHtml(href)}">`,
            escapeHtml(resource.heading),
            icon('arrow', 'seo-resource-arrow'),
            '</a>'
        ].join('')
        : escapeHtml(resource.heading);

    return [
        '<article class="seo-resource-card">',
        icon(iconName, 'seo-resource-icon'),
        '<div>',
        `<h4>${heading}</h4>`,
        resource.body ? `<p>${escapeHtml(resource.body)}</p>` : '',
        '</div>',
        '</article>'
    ].join('\n');
}

function renderResourceSection(id, iconName, title, resources) {
    if (!resources.length) return '';

    return [
        '<section class="seo-category-section">',
        renderCategoryHeader(id, iconName, title),
        '<div class="seo-resource-grid">',
        ...resources.map(resource => renderResourceCard(resource, iconName)),
        '</div>',
        '</section>'
    ].join('\n');
}

function categorizedResources(copy) {
    const clusterSections = copy.cluster?.sections || [];

    if (clusterSections.length) {
        const usable = clusterSections
            .filter(section => section.id !== 'how-to-use');

        return {
            weapons: usable.filter(section => /mortar|sph-2/.test(section.id)),
            maps: usable
                .filter(section => /interactive-map/.test(section.id))
                .map(section => ({
                    ...section,
                    href: section.href || mapHrefFromText(section.heading)
                })),
            tools: usable.filter(section => !/mortar|sph-2|interactive-map/.test(section.id))
        };
    }

    const resources = (copy.features || [])
        .map((heading, index) => ({
            heading,
            index,
            href: mapHrefFromText(heading)
        }));

    return {
        weapons: resources.slice(0, 2),
        maps: resources.filter(resource => resource.href),
        tools: resources.filter(resource => resource.index >= 2 && !resource.href)
    };
}

function renderResources(copy) {
    const labels = guideCategories(copy.guide);
    const resources = categorizedResources(copy);

    return [
        renderResourceSection('guide-weapons', 'weapons', labels.weapons, resources.weapons),
        renderResourceSection('guide-maps', 'maps', labels.maps, resources.maps),
        renderResourceSection('guide-tools', 'tools', labels.tools, resources.tools)
    ].join('\n');
}

function renderFaq(copy) {
    const faq = copy.faq || [];
    if (!faq.length) return '';

    const labels = guideCategories(copy.guide);
    const items = faq
        .map(item => [
            '<details class="seo-faq-item">',
            '<summary>',
            `<span>${escapeHtml(item.question)}</span>`,
            '<span aria-hidden="true" class="seo-faq-toggle">+</span>',
            '</summary>',
            `<p>${escapeHtml(item.answer)}</p>`,
            '</details>'
        ].join('\n'))
        .join('\n');

    return [
        '<section class="seo-category-section seo-faq">',
        renderCategoryHeader('wardogs-calculator-faq', 'faq', labels.faq),
        '<div class="seo-faq-list">',
        items,
        '</div>',
        '</section>'
    ].join('\n');
}

export function renderSeoGuideContent(copy) {
    if (!copy?.guide) return '';

    return [
        '<article class="seo-guide-hub">',
        renderHero(copy),
        renderCategoryNavigation(copy.guide),
        renderGettingStarted(copy.guide),
        renderResources(copy),
        renderFaq(copy),
        '</article>'
    ].join('\n');
}
