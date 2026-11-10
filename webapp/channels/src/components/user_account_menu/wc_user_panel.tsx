// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo, useRef} from 'react';
import {useSelector} from 'react-redux';

import {Client4} from 'mattermost-redux/client';
import {getCurrentUser, getStatusForUserId} from 'mattermost-redux/selectors/entities/users';
import {getFullName} from 'mattermost-redux/utils/user_utils';

import {isCustomStatusEnabled, isCustomStatusExpired, makeGetCustomStatus} from 'selectors/views/custom_status';
import {getScheduledAbsenceForUserId} from 'selectors/views/scheduled_absence';

import UserAccountMenu from 'components/user_account_menu';
import {ELEMENT_ID_FOR_USER_ACCOUNT_MENU_BUTTON} from 'components/user_account_menu/user_account_menu';

import {isDesktopApp} from 'utils/user_agent';

import type {GlobalState} from 'types/store';

import {useWcUserLogoutListener, useWcUserStatusSync} from './wc_user_panel_hooks';
import {
    getInfomaniakUserId,
    getPanelTrigger,
    toWebComponentPresence,
} from './wc_user_panel_platform';

import './wc_user_panel.css';

export default function WcUserPanel() {
    const currentUser = useSelector(getCurrentUser);
    const status = useSelector((state: GlobalState) => getStatusForUserId(state, currentUser?.id || ''));
    const scheduledAbsence = useSelector((state: GlobalState) => (
        currentUser ? getScheduledAbsenceForUserId(state, currentUser.id) : undefined
    ));
    const getCustomStatus = useMemo(makeGetCustomStatus, []);
    const customStatus = useSelector((state: GlobalState) => getCustomStatus(state));
    const customStatusExpired = useSelector((state: GlobalState) => isCustomStatusExpired(state, customStatus));
    const customStatusEnabled = useSelector(isCustomStatusEnabled);
    const infomaniakUserId = getInfomaniakUserId(currentUser);
    useWcUserStatusSync(infomaniakUserId, status, scheduledAbsence);
    useWcUserLogoutListener();
    const forwardingClickRef = useRef(false);

    const handleHostClick = (event: React.MouseEvent<HTMLElement>) => {
        if (event.isTrusted || forwardingClickRef.current) {
            return;
        }
        forwardingClickRef.current = true;
        try {
            getPanelTrigger(event.currentTarget)?.click();
        } finally {
            forwardingClickRef.current = false;
        }
    };

    if (!currentUser) {
        return null;
    }

    if (!infomaniakUserId) {
        return <UserAccountMenu/>;
    }

    const avatarUrl = Client4.getProfilePictureUrl(currentUser.id, currentUser.last_picture_update);
    const displayName = getFullName(currentUser) || currentUser.username;
    const displayCustomStatus = customStatusEnabled && customStatus?.emoji && !customStatusExpired ? customStatus : undefined;
    const customStatusProps = displayCustomStatus ? {
        'custom-status-text': displayCustomStatus.text,
        'custom-status-emoji': displayCustomStatus.emoji,
        'custom-status-duration': displayCustomStatus.duration,
        'custom-status-expires-at': displayCustomStatus.expires_at,
    } : {};

    return (
        <div className='wcUserPanel'>
            <wc-user-panel
                id={ELEMENT_ID_FOR_USER_ACCOUNT_MENU_BUTTON}
                size='sm'
                tabIndex={0}
                onClick={handleHostClick}
                user-id={infomaniakUserId}
                user-name={displayName}
                user-mail={currentUser.email}
                user-avatar-src={avatarUrl}
                user-uuid={currentUser.id}
                user-presence={toWebComponentPresence(status)}
                {...customStatusProps}
                show-manage-profile={!isDesktopApp()}
                server-url={window.location.origin}
            />
        </div>
    );
}
