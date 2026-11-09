// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import React from 'react';

import type {DeepPartial} from '@mattermost/types/utilities';

import AbsenceIndicator from 'components/advanced_text_editor/post_box_indicator/absence_indicator';

import {renderWithContext, screen} from 'tests/react_testing_utils';

import type {GlobalState} from 'types/store';

type ScheduledAbsences = Record<string, {start: number; end: number}>;

describe('components/advanced_text_editor/post_box_indicator/absence_indicator', () => {
    const now = new Date('2026-05-04T12:00:00Z').getTime();

    beforeAll(() => {
        jest.useFakeTimers();
        jest.setSystemTime(now);
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    function getBaseState(scheduledAbsences: ScheduledAbsences, extraChannels: Record<string, unknown> = {}): DeepPartial<GlobalState> {
        return {
            entities: {
                channels: {
                    channels: {
                        dm_channel_id: {
                            id: 'dm_channel_id',
                            teammate_id: 'teammate_user_id',
                            type: 'D',
                            name: 'current_user_id__teammate_user_id',
                        },
                        ...extraChannels,
                    },
                },
                users: {
                    currentUserId: 'current_user_id',
                    scheduledAbsences,
                },
            },
        };
    }

    test('should render the ongoing absence', () => {
        const state = getBaseState({
            teammate_user_id: {start: now - 3600_000, end: now + 3600_000},
        });

        renderWithContext(
            <AbsenceIndicator
                channelId='dm_channel_id'
                displayName='Laura Snow'
            />,
            state,
        );

        expect(screen.getByTestId('absenceIndicator').textContent).toContain('Laura Snow');
        expect(screen.getByTestId('absenceIndicator').textContent).toContain('currently out of office');
    });

    test('should render the upcoming absence', () => {
        const state = getBaseState({
            teammate_user_id: {start: now + 86_400_000, end: now + (2 * 86_400_000)},
        });

        renderWithContext(
            <AbsenceIndicator
                channelId='dm_channel_id'
                displayName='Laura Snow'
            />,
            state,
        );

        expect(screen.getByTestId('absenceIndicator').textContent).toContain('Laura Snow');
        expect(screen.getByTestId('absenceIndicator').textContent).toContain('scheduled absence');
    });

    test('should not render when the teammate has no scheduled absence', () => {
        const state = getBaseState({});

        renderWithContext(
            <AbsenceIndicator
                channelId='dm_channel_id'
                displayName='Laura Snow'
            />,
            state,
        );

        expect(screen.queryByTestId('absenceIndicator')).not.toBeInTheDocument();
    });

    test('should not render when the absence has ended', () => {
        const state = getBaseState({
            teammate_user_id: {start: now - 7200_000, end: now - 3600_000},
        });

        renderWithContext(
            <AbsenceIndicator
                channelId='dm_channel_id'
                displayName='Laura Snow'
            />,
            state,
        );

        expect(screen.queryByTestId('absenceIndicator')).not.toBeInTheDocument();
    });

    test('should render in a self DM', () => {
        const state = getBaseState({
            current_user_id: {start: now - 3600_000, end: now + 3600_000},
        }, {
            self_dm_channel_id: {
                id: 'self_dm_channel_id',
                teammate_id: 'current_user_id',
                type: 'D',
                name: 'current_user_id__current_user_id',
            },
        });

        renderWithContext(
            <AbsenceIndicator
                channelId='self_dm_channel_id'
                displayName='current_username'
            />,
            state,
        );

        expect(screen.queryByTestId('absenceIndicator')).toBeInTheDocument();
    });
});
