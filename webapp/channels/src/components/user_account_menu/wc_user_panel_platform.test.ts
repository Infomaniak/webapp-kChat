// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ScheduledAbsence, UserProfile} from '@mattermost/types/users';

import {emitUserLoggedOutEvent} from 'actions/global_actions';

import {UserStatuses} from 'utils/constants';

import {
    WC_EVENT_USER_STATUS_UPDATE,
    dispatchWcUserStatusUpdate,
    getInfomaniakUserId,
    handleWcUserLogout,
    toWebComponentPresence,
} from './wc_user_panel_platform';

jest.mock('actions/global_actions', () => ({
    emitUserLoggedOutEvent: jest.fn(),
}));

describe('components/user_account_menu/wc_user_panel_platform', () => {
    describe('getInfomaniakUserId', () => {
        it('returns the infomaniak user id carried by the kChat user', () => {
            expect(getInfomaniakUserId({id: 'uuid-1', username: 'boris.trombert', user_id: 1728507} as UserProfile)).toBe(1728507);
        });

        it('returns null when the user carries no infomaniak id', () => {
            expect(getInfomaniakUserId({id: 'uuid-1', username: 'boris.trombert'} as UserProfile)).toBeNull();
        });

        it('returns null when no user is loaded', () => {
            expect(getInfomaniakUserId(undefined)).toBeNull();
        });
    });

    describe('toWebComponentPresence', () => {
        it('maps the kChat statuses to the web component presences', () => {
            expect(toWebComponentPresence(UserStatuses.ONLINE)).toBe('online');
            expect(toWebComponentPresence(UserStatuses.AWAY)).toBe('away');
            expect(toWebComponentPresence(UserStatuses.DND)).toBe('dnd');
            expect(toWebComponentPresence(UserStatuses.OUT_OF_OFFICE)).toBe('away');
            expect(toWebComponentPresence(UserStatuses.OFFLINE)).toBe('offline');
        });

        it('falls back to offline for unknown or missing statuses', () => {
            expect(toWebComponentPresence('unknown')).toBe('offline');
            expect(toWebComponentPresence(undefined)).toBe('offline');
        });
    });

    describe('dispatchWcUserStatusUpdate', () => {
        const dispatchListener = jest.fn();

        beforeEach(() => {
            dispatchListener.mockClear();
            window.addEventListener(WC_EVENT_USER_STATUS_UPDATE, dispatchListener);
        });

        afterEach(() => {
            window.removeEventListener(WC_EVENT_USER_STATUS_UPDATE, dispatchListener);
        });

        it('dispatches the status update with presence and absence detail', () => {
            const scheduledAbsence = {start: 1793404800000, end: 1793440800000} as ScheduledAbsence;

            dispatchWcUserStatusUpdate(1728507, UserStatuses.DND, scheduledAbsence);

            expect(dispatchListener).toHaveBeenCalledTimes(1);
            const detail = dispatchListener.mock.calls[0][0].detail;
            expect(detail.id).toBe(1728507);
            expect(detail.presence.status).toBe('dnd');
            expect(detail.scheduledAbsence).toEqual({start: 1793404800000, end: 1793440800000});
        });

        it('dispatches a null absence when none is set', () => {
            dispatchWcUserStatusUpdate(1728507, UserStatuses.ONLINE, undefined);

            const detail = dispatchListener.mock.calls[0][0].detail;
            expect(detail.presence.status).toBe('online');
            expect(detail.scheduledAbsence).toBeNull();
        });
    });

    describe('handleWcUserLogout', () => {
        it('emits the ikLogout flow', () => {
            handleWcUserLogout();

            expect(emitUserLoggedOutEvent).toHaveBeenCalledWith('ikLogout');
        });
    });
});
