// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-hooks';

import type {ScheduledAbsence} from '@mattermost/types/users';

import {useWcUserLogoutListener, useWcUserStatusSync} from './wc_user_panel_hooks';
import {
    WC_EVENT_USER_LOGOUT,
    dispatchWcUserStatusUpdate,
    handleWcUserLogout,
} from './wc_user_panel_platform';

jest.mock('./wc_user_panel_platform', () => ({
    WC_EVENT_USER_LOGOUT: 'wc-user-logout',
    dispatchWcUserStatusUpdate: jest.fn(),
    handleWcUserLogout: jest.fn(),
}));

describe('components/user_account_menu/wc_user_panel_hooks', () => {
    describe('useWcUserStatusSync', () => {
        type StatusSyncProps = {userId: number | null; userStatus: string | undefined; absence: ScheduledAbsence | undefined};

        it('dispatches the status update once the web component is defined', async () => {
            const scheduledAbsence = {start: 1793400000000, end: 1793486000000} as ScheduledAbsence;
            jest.spyOn(customElements, 'whenDefined').mockResolvedValue(HTMLElement);

            const {rerender} = renderHook<StatusSyncProps, void>(
                ({userId, userStatus, absence}) => useWcUserStatusSync(userId, userStatus, absence),
                {initialProps: {userId: null, userStatus: 'dnd', absence: undefined}},
            );

            expect(dispatchWcUserStatusUpdate).not.toHaveBeenCalled();

            await act(async () => {
                rerender({userId: 1728507, userStatus: 'dnd', absence: scheduledAbsence});
                await Promise.resolve();
            });

            expect(dispatchWcUserStatusUpdate).toHaveBeenCalledWith(1728507, 'dnd', scheduledAbsence);
        });
    });

    describe('useWcUserLogoutListener', () => {
        it('relays the web component logout event', () => {
            renderHook(() => useWcUserLogoutListener());

            act(() => {
                window.dispatchEvent(new CustomEvent(WC_EVENT_USER_LOGOUT));
            });

            expect(handleWcUserLogout).toHaveBeenCalled();
        });
    });
});
