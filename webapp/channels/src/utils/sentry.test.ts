// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ErrorEvent, StackFrame} from '@sentry/types';

import {isWebComponentsEvent} from 'utils/sentry';

describe('utils/sentry.isWebComponentsEvent', () => {
    const wcFrame: StackFrame = {filename: 'https://web-components.storage.infomaniak.com/next/module-news/build/module-news.esm.js'};
    const wcPatternFrame: StackFrame = {filename: 'https://wc-preprod.example.infomaniak.ch/module-products/build/module-products.esm.js'};
    const appFrame: StackFrame = {filename: 'app:///main.js'};

    const buildEvent = (frames: StackFrame[]): ErrorEvent => ({
        type: undefined,
        exception: {
            values: [{type: 'Error', value: 'boom', stacktrace: {frames}}],
        },
    });

    test('tags an event whose throw site comes from the web-components host', () => {
        expect(isWebComponentsEvent(buildEvent([appFrame, wcFrame]))).toBe(true);
    });

    test('tags an event whose throw site matches the module build path pattern on another host', () => {
        expect(isWebComponentsEvent(buildEvent([appFrame, wcPatternFrame]))).toBe(true);
    });

    test('does not tag an event whose throw site is app code even with web-components frames in the caller chain', () => {
        expect(isWebComponentsEvent(buildEvent([wcFrame, wcFrame, appFrame]))).toBe(false);
    });

    test('does not tag an event whose throw site has no filename', () => {
        expect(isWebComponentsEvent(buildEvent([wcFrame, {lineno: 3}]))).toBe(false);
    });

    test('does not tag an event without exception', () => {
        expect(isWebComponentsEvent({type: undefined, message: 'hello'})).toBe(false);
    });

    test('does not tag an exception without frames', () => {
        expect(isWebComponentsEvent({type: undefined, exception: {values: [{type: 'UnhandledRejection', value: '[object Object]'}]}})).toBe(false);
    });
});
