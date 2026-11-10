// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ErrorEvent, StackFrame} from '@sentry/types';

import {isWebComponentsEvent, transformStateForSentry} from 'utils/sentry';

import type {GlobalState} from 'types/store';

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

describe('utils/sentry.transformStateForSentry', () => {
    const baseState = {
        entities: {
            posts: {
                posts: {
                    post1: {id: 'post1', message: 'secret post message'},
                },
                messagesHistory: {
                    messages: ['typed message one', 'typed message two'],
                    index: {post: 2, comment: 2},
                },
                postEditHistory: [
                    {id: 'post1', message: 'secret prior version'},
                    {id: 'post2', message: 'secret second version'},
                ],
            },
            scheduledPosts: {
                byId: {
                    scheduled1: {id: 'scheduled1', message: 'secret scheduled message'},
                    scheduled2: undefined,
                },
                byTeamId: {},
                errorsByTeamId: {},
                byChannelOrThreadId: {},
            },
            users: {
                profiles: {
                    user1: {id: 'user1', email: 'user1@example.com', first_name: 'First', last_name: 'Last', nickname: 'Nick', username: 'userone'},
                },
            },
            channels: {
                channels: {
                    channel1: {id: 'channel1', display_name: 'Display', name: 'display', header: 'Header', purpose: 'Purpose'},
                },
            },
        },
        storage: {
            initialized: true,
            storage: {
                draft_channel1: {timestamp: new Date(0), value: {message: 'draft text'}},
                comment_draft_root1: {timestamp: new Date(0), value: {message: 'comment draft text'}},
            },
        },
    };

    const transform = () => transformStateForSentry(baseState as unknown as GlobalState) as GlobalState;

    test('empties the persisted-draft storage subtree', () => {
        const result = transform();
        expect(result.storage.storage).toEqual({});
        expect(result.storage.initialized).toBe(true);
    });

    test('redacts every typed-message history entry', () => {
        const result = transform();
        expect(result.entities.posts.messagesHistory.messages).toEqual(['[REDACTED_MESSAGE]', '[REDACTED_MESSAGE]']);
        expect(result.entities.posts.messagesHistory.index).toEqual({post: 2, comment: 2});
    });

    test('redacts every post edit history version', () => {
        const result = transform();
        expect(result.entities.posts.postEditHistory.map((post: {message: string}) => post.message)).toEqual(['[REDACTED_MESSAGE]', '[REDACTED_MESSAGE]']);
    });

    test('redacts scheduled post messages and skips absent entries', () => {
        const result = transform();
        expect(result.entities.scheduledPosts.byId.scheduled1?.message).toBe('[REDACTED_MESSAGE]');
        expect(result.entities.scheduledPosts.byId.scheduled2).toBeUndefined();
    });

    test('keeps previously-redacted subtrees redacted', () => {
        const result = transform();
        expect(result.entities.posts.posts.post1.message).toBe('[REDACTED_MESSAGE]');
        expect(result.entities.users.profiles.user1.email).toBe('[REDACTED_EMAIL]');
        expect(result.entities.users.profiles.user1.first_name).toBe('[REDACTED]');
        expect(result.entities.users.profiles.user1.username).toBe('user_user1');
        expect(result.entities.channels.channels.channel1.display_name).toBe('Channel channe');
        expect(result.entities.channels.channels.channel1.header).toBe('[REDACTED_HEADER]');
    });

    test('serializes without any draft or typed-message content', () => {
        const serialized = JSON.stringify(transform());
        expect(serialized).not.toContain('draft text');
        expect(serialized).not.toContain('comment draft text');
        expect(serialized).not.toContain('typed message');
        expect(serialized).not.toContain('secret post message');
    });

    test('returns null for missing state', () => {
        expect(transformStateForSentry(undefined)).toBeNull();
    });
});
