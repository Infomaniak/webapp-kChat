// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect} from 'react';

import type {ScheduledAbsence} from '@mattermost/types/users';

import {
    WC_EVENT_USER_LOGOUT,
    dispatchWcUserStatusUpdate,
    handleWcUserLogout,
} from './wc_user_panel_platform';

export function useWcUserStatusSync(infomaniakUserId: number | null, status: string | undefined, scheduledAbsence: ScheduledAbsence | undefined) {
    useEffect(() => {
        if (!infomaniakUserId) {
            return undefined;
        }

        let isMounted = true;
        customElements.whenDefined('wc-user-panel').then(() => {
            if (isMounted) {
                dispatchWcUserStatusUpdate(infomaniakUserId, status, scheduledAbsence);
            }
        });

        return () => {
            isMounted = false;
        };
    }, [infomaniakUserId, status, scheduledAbsence]);
}

export function useWcUserLogoutListener() {
    useEffect(() => {
        window.addEventListener(WC_EVENT_USER_LOGOUT, handleWcUserLogout);
        return () => {
            window.removeEventListener(WC_EVENT_USER_LOGOUT, handleWcUserLogout);
        };
    }, []);
}
