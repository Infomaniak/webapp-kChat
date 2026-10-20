// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {mount} from 'enzyme';
import React from 'react';

import type {Post} from '@mattermost/types/posts';

import {mockStore} from 'tests/test_store';

import RootPostDivider from './root_post_divider';

describe('components/root_post_divider', () => {
    const basePost = {
        id: 'rootid',
        root_id: '',
        channel_id: 'cid',
        create_at: 1,
        update_at: 1,
        delete_at: 0,
        user_id: 'uid',
        message: 'root message',
        type: '',
        reply_count: 0,
    } as unknown as Post;

    const reply = (id: string, createAt: number) => ({
        id,
        root_id: 'rootid',
        channel_id: 'cid',
        create_at: createAt,
        update_at: createAt,
        delete_at: 0,
        user_id: 'uid2',
        message: 'reply ' + id,
        type: '',
        reply_count: 0,
    } as unknown as Post);

    const buildState = (threadReplyCount: number, loadedReplies: Post[]) => ({
        entities: {
            general: {
                config: {},
            },
            users: {
                currentUserId: 'uid',
                profiles: {},
            },
            posts: {
                posts: {
                    rootid: basePost,
                    ...Object.fromEntries(loadedReplies.map((r) => [r.id, r])),
                },
                postsInThread: {rootid: loadedReplies.map((r) => r.id)},
            },
            threads: {
                threads: {
                    rootid: {
                        id: 'rootid',
                        participants: [],
                        reply_count: threadReplyCount,
                        unread_replies: 0,
                        unread_mentions: 0,
                        last_reply_at: 0,
                        last_viewed_at: 0,
                        is_following: true,
                        post: {
                            channel_id: 'cid',
                            user_id: 'uid',
                        },
                    },
                },
            },
        },
    });

    test('should not render when there are no replies', () => {
        const {mountOptions} = mockStore(buildState(0, []));

        const wrapper = mount(
            <RootPostDivider postId='rootid'/>,
            mountOptions,
        );

        expect(wrapper.isEmptyRender()).toBe(true);
    });

    test('should count loaded replies when thread metadata is stale', () => {
        const {mountOptions} = mockStore(buildState(1, [reply('reply1', 2), reply('reply2', 3)]));

        const wrapper = mount(
            <RootPostDivider postId='rootid'/>,
            mountOptions,
        );

        expect(wrapper.find('FormattedMessage[id="threading.numReplies"]').prop('values')).toMatchObject({totalReplies: 2});
    });

    test('should keep the metadata count when the thread is only partially loaded', () => {
        const {mountOptions} = mockStore(buildState(50, [reply('reply1', 2)]));

        const wrapper = mount(
            <RootPostDivider postId='rootid'/>,
            mountOptions,
        );

        expect(wrapper.find('FormattedMessage[id="threading.numReplies"]').prop('values')).toMatchObject({totalReplies: 50});
    });
});
