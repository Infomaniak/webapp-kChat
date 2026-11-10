// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs';

import {render} from '@testing-library/react';
import path from 'path';
import React from 'react';
import {IntlProvider} from 'react-intl';
import {Provider} from 'react-redux';

import type {DeepPartial} from '@mattermost/types/utilities';

import {TestHelper} from 'utils/test_helper';

import mockStore from 'tests/test_store';

import type {GlobalState} from 'types/store';

import CreateComment from './create_comment';

jest.mock('components/advanced_create_comment', () => {
    const ReactMock = require('react');
    return {
        __esModule: true,
        default: () => ReactMock.createElement('div'),
    };
});

const i18nDir = path.join(__dirname, '../../../i18n');
const localeFiles = fs.readdirSync(i18nDir).filter((file) => file.endsWith('.json')).sort();
const locales = localeFiles.map((file) => file.replace(/\.json$/, ''));
const translations = (locale: string) => JSON.parse(fs.readFileSync(path.join(i18nDir, `${locale}.json`), 'utf8')) as Record<string, string>;

const stripTags = (message: string) => message.replace(/<[^>]+>/g, '');
const englishDeactivatedUserFallback = 'You are viewing an archived channel with a deactivated user. New messages cannot be posted.';
const englishArchivedChannelFallback = 'You are viewing a thread from an archived channel. New messages cannot be posted.';

const currentUserId = 'current_user_id';
const deactivatedTeammate = TestHelper.getUserMock({
    id: 'teammate_id',
    username: 'deactivated.user',
    delete_at: 1772457978000,
});
const dmChannel = TestHelper.getChannelMock({
    id: 'dm_channel_id',
    type: 'D',
    name: `${currentUserId}__${deactivatedTeammate.id}`,
});
const rootPost = TestHelper.getPostMock({id: 'root_post_id', channel_id: dmChannel.id});
const archivedChannel = TestHelper.getChannelMock({
    id: 'archived_channel_id',
    type: 'O',
    delete_at: 1772457978000,
});
const archivedRootPost = TestHelper.getPostMock({id: 'archived_post_id', channel_id: archivedChannel.id});

function buildState({channel, post}: {channel: typeof dmChannel; post: typeof rootPost}): DeepPartial<GlobalState> {
    return {
        entities: {
            users: {
                currentUserId,
                profiles: {
                    [currentUserId]: TestHelper.getUserMock({id: currentUserId, username: 'current.user'}),
                    [deactivatedTeammate.id]: deactivatedTeammate,
                },
                profilesInChannel: {},
                statuses: {},
            },
            channels: {
                channels: {[channel.id]: channel},
                membersInChannel: {
                    [channel.id]: {
                        [currentUserId]: TestHelper.getChannelMembershipMock({
                            channel_id: channel.id,
                            user_id: currentUserId,
                        }),
                    },
                },
                myMembers: {
                    [channel.id]: TestHelper.getChannelMembershipMock({
                        channel_id: channel.id,
                        user_id: currentUserId,
                    }),
                },
            },
            posts: {
                posts: {[post.id]: post},
                limitedViews: {threads: {}, channels: {}},
            },
            general: {
                config: {TeammateNameDisplay: 'username'},
            },
            preferences: {
                myPreferences: {},
            },
        },
    };
}

function renderWithLocale(locale: string, state: DeepPartial<GlobalState>, props: {threadId: string; teammate?: typeof deactivatedTeammate}) {
    const store = mockStore(state);

    return render(
        <Provider store={store}>
            <IntlProvider
                locale={locale}
                messages={translations(locale)}
            >
                <CreateComment
                    {...props}
                    isThreadView={true}
                />
            </IntlProvider>
        </Provider>,
    );
}

describe('components/threading/CreateComment - archived thread composer banner (RM-645199)', () => {
    test.each(locales)('renders the deactivated user banner from the %s bundle without falling back to the English default', (locale) => {
        const state = buildState({channel: dmChannel, post: rootPost});

        const {container} = renderWithLocale(locale, state, {threadId: rootPost.id, teammate: deactivatedTeammate});

        expect(container.textContent).toContain(stripTags(translations(locale)['createComment.threadFromDeactivatedUserMessage']));
        if (locale !== 'en') {
            expect(container.textContent).not.toContain(englishDeactivatedUserFallback);
        }
    });

    test.each(locales)('renders the archived channel banner from the %s bundle without falling back to the English default', (locale) => {
        const state = buildState({channel: archivedChannel, post: archivedRootPost});

        const {container} = renderWithLocale(locale, state, {threadId: archivedRootPost.id});

        expect(container.textContent).toContain(stripTags(translations(locale)['createComment.threadFromArchivedChannelMessage']));
        if (locale !== 'en') {
            expect(container.textContent).not.toContain(englishArchivedChannelFallback);
        }
    });
});
