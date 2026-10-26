// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Renderer from './renderer';

describe('markdown link classification security', () => {
    const renderLink = (href: string, text = 'Join the call', siteURL = 'https://kchat.infomaniak.com') => {
        const renderer = new Renderer({}, {siteURL});
        return renderer.link(href, '', `<strong>${text}</strong>`);
    };

    test('protocol-relative URL opens in a new tab instead of navigating the view', () => {
        const html = renderLink('//127.0.0.1:8666/attack', 'Test repro RCE');

        expect(html).toContain('href="//127.0.0.1:8666/attack"');
        expect(html).toContain('target="_blank"');
        expect(html).not.toContain('data-link=');
    });

    test('backslash-prefixed authority URL opens in a new tab instead of navigating the view', () => {
        const html = renderLink('/\\attacker.example/attack');

        expect(html).toContain('href="/\\attacker.example/attack"');
        expect(html).toContain('target="_blank"');
        expect(html).not.toContain('data-link=');
    });

    test('relative permalink stays internal and keeps the data-link router behaviour', () => {
        const html = renderLink('/teamname/pl/affe2344234');

        expect(html).toContain('data-link="/teamname/pl/affe2344234"');
        expect(html).not.toContain('target="_blank"');
    });

    test('bold text inside an internal link keeps the anchor structure the click handler relies on', () => {
        const html = renderLink('/teamname/pl/affe2344234');

        expect(html).toEqual('<a class="theme markdown__link" href="/teamname/pl/affe2344234" rel="noreferrer" data-link="/teamname/pl/affe2344234"><strong>Join the call</strong></a>');
    });
});
