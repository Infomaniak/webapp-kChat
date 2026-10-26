// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    getRelativeChannelURL,
    getSiteURL,
    getSiteURLFromWindowObject,
    isInternalURL,
    isPermalinkURL,
    shouldOpenInNewTab,
    validateChannelUrl,
} from 'utils/url';

describe('Utils.URL', () => {
    test('getRelativeChannelURL', () => {
        expect(getRelativeChannelURL('teamName', 'channelName')).toEqual('/teamName/channels/channelName');
    });

    describe('getSiteURL', () => {
        const testCases = [
            {
                description: 'origin',
                location: {origin: 'http://example.com:8065', protocol: '', hostname: '', port: ''},
                basename: '',
                expectedSiteURL: 'http://example.com:8065',
            },
            {
                description: 'origin, trailing slash',
                location: {origin: 'http://example.com:8065/', protocol: '', hostname: '', port: ''},
                basename: '',
                expectedSiteURL: 'http://example.com:8065',
            },
            {
                description: 'origin, with basename',
                location: {origin: 'http://example.com:8065', protocol: '', hostname: '', port: ''},
                basename: '/subpath',
                expectedSiteURL: 'http://example.com:8065/subpath',
            },
            {
                description: 'no origin',
                location: {origin: '', protocol: 'http:', hostname: 'example.com', port: '8065'},
                basename: '',
                expectedSiteURL: 'http://example.com:8065',
            },
            {
                description: 'no origin, with basename',
                location: {origin: '', protocol: 'http:', hostname: 'example.com', port: '8065'},
                basename: '/subpath',
                expectedSiteURL: 'http://example.com:8065/subpath',
            },
        ];

        testCases.forEach((testCase) => it(testCase.description, () => {
            const obj = {
                location: testCase.location,
                basename: testCase.basename,
            };

            expect(getSiteURLFromWindowObject(obj)).toEqual(testCase.expectedSiteURL);
        }));
    });

    describe('validateChannelUrl', () => {
        const testCases = [
            {
                description: 'Called with an empty string',
                url: '',
                expectedErrors: ['change_url.longer'],
            },
            {
                description: 'Called with a url starting with a dash',
                url: '-Url',
                expectedErrors: ['change_url.startWithLetter'],
            },
            {
                description: 'Called with a url starting with an underscore',
                url: '_URL',
                expectedErrors: ['change_url.startWithLetter'],
            },
            {
                description: 'Called with a url starting and ending with an underscore',
                url: '_a_',
                expectedErrors: ['change_url.startAndEndWithLetter'],
            },
            {
                description: 'Called with a url starting and ending with an dash',
                url: '-a-',
                expectedErrors: ['change_url.startAndEndWithLetter'],
            },
            {
                description: 'Called with a url ending with an dash',
                url: 'a----',
                expectedErrors: ['change_url.endWithLetter'],
            },
            {
                description: 'Called with a url containing two underscores',
                url: 'foo__bar',
                expectedErrors: [],
            },
            {
                description: 'Called with a url resembling a direct message url',
                url: '51a8e380-5196-4d53-aff3-cda79764729e__51a8e380-5196-4d53-aff3-cda79764729e',
                expectedErrors: ['change_url.invalidDirectMessage', 'change_url.shorter'],
            },
            {
                description: 'Called with a containing two dashes',
                url: 'foo--bar',
                expectedErrors: [],
            },
            {
                description: 'Called with a capital letters two dashes',
                url: 'Foo--bar',
                expectedErrors: ['change_url.invalidUrl'],
            },
        ];

        testCases.forEach((testCase) => it(testCase.description, () => {
            const returnedErrors = validateChannelUrl(testCase.url).map((error) => (typeof error === 'string' ? error : error.key));
            returnedErrors.sort();
            testCase.expectedErrors.sort();
            expect(returnedErrors).toEqual(testCase.expectedErrors);
        }));
    });

    describe('isPermalinkURL', () => {
        const siteURL = getSiteURL();
        test.each([
            ['/teamname-1/pl/affe2344234', true],
            [`${siteURL}/teamname-1/pl/affe2344234`, true],
            [siteURL, false],
            ['/teamname-1/channel/post', false],
            ['https://example.com', false],
            ['https://example.com/teamname-1/pl/affe2344234', false],
        ])('is permalink for %s should return %s', (url, expected) => {
            expect(isPermalinkURL(url)).toBe(expected);
        });
    });

    describe('isInternalURL', () => {
        const siteURL = 'https://kchat.infomaniak.com';
        test.each([
            ['relative path is internal', '/teamname-1/pl/affe2344234', undefined, true],
            ['hash is internal', '#anchor', undefined, true],
            ['full site URL is internal', `${siteURL}/teamname-1/pl/affe2344234`, siteURL, true],
            ['protocol-relative URL is not internal', '//evil.example/attack', siteURL, false],
            ['protocol-relative URL to local host is not internal', '//127.0.0.1:8666/attack', siteURL, false],
            ['backslash-prefixed authority URL is not internal', '/\\evil.example/attack', siteURL, false],
            ['tab-then-slash authority URL is not internal', '/\t/evil.example/attack', siteURL, false],
            ['full external URL is not internal', 'https://evil.example/attack', siteURL, false],
            ['mailto is not internal', 'mailto:someone@example.com', siteURL, false],
            ['empty string is not internal', '', siteURL, false],
        ])('%s', (_description, url, siteUrl, expected) => {
            expect(isInternalURL(url, siteUrl)).toBe(expected);
        });
    });

    describe('shouldOpenInNewTab', () => {
        const siteURL = 'https://kchat.infomaniak.com';
        test.each([
            ['relative permalink opens in same view', '/teamname-1/pl/affe2344234', siteURL, false],
            ['full site URL opens in same view', `${siteURL}/teamname-1/pl/affe2344234`, siteURL, false],
            ['protocol-relative URL opens in new tab', '//evil.example/attack', siteURL, true],
            ['backslash-prefixed authority URL opens in new tab', '/\\evil.example/attack', siteURL, true],
            ['full external URL opens in new tab', 'https://evil.example/attack', siteURL, true],
        ])('%s', (_description, url, siteUrl, expected) => {
            expect(shouldOpenInNewTab(url, siteUrl)).toBe(expected);
        });
    });
});
