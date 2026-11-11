// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {ScheduledAbsence, UserProfile} from '@mattermost/types/users';

import {emitUserLoggedOutEvent} from 'actions/global_actions';

import {UserStatuses} from 'utils/constants';

export const WC_EVENT_CREATE_SCHEDULED_ABSENCE = 'createScheduledAbsence';
export const WC_EVENT_OPEN_SCHEDULED_ABSENCE = 'openScheduledAbsence';
export const WC_EVENT_EDIT_SCHEDULED_ABSENCE = 'editScheduledAbsence';
export const WC_EVENT_USER_LOGOUT = 'wc-user-logout';
export const WC_EVENT_USER_STATUS_UPDATE = 'wcUserStatusUpdate';

type WindowWithWebComponentEndpoints = {
    WEB_COMPONENT_API_ENDPOINT?: string;
};

type WebComponentsStore = WindowWithWebComponentEndpoints & {
    webComponentsStore?: {
        utils?: {
            goToLink?: (event: MouseEvent, link: {url: string}, prevent?: boolean) => boolean;
        };
    };
};

export type WcMevEventCrudModalElement = HTMLElement & {
    features?: {event?: boolean; eventPoll?: boolean; absence?: boolean};
    disableLayoutAction?: boolean;
    disableMinimizeAction?: boolean;
    isOpened?: boolean;
    refreshAbsences?: () => Promise<void>;
};

export type ScheduledAbsenceEditRequestDetail = {
    absence?: {uuid?: string};
    scope?: 'one' | 'all';
};

type UserWithInfomaniakId = UserProfile & {user_id?: number};

export function getInfomaniakUserId(user: UserProfile | undefined): number | null {
    return (user as UserWithInfomaniakId | undefined)?.user_id ?? null;
}

type WcUserStatusUpdateDetail = {
    id: number;
    presence: {status: string};
    scheduledAbsence: {start: number; end: number} | null;
};

export function toWebComponentPresence(status?: string): string {
    if (status === UserStatuses.OUT_OF_OFFICE) {
        return 'away';
    }
    if (status === UserStatuses.ONLINE) {
        return 'online';
    }
    if (status === UserStatuses.AWAY) {
        return 'away';
    }
    if (status === UserStatuses.DND) {
        return 'dnd';
    }
    return 'offline';
}

export function getPanelTrigger(host: HTMLElement | null): HTMLElement | null {
    const panel = host?.shadowRoot?.querySelector('wc-panel');
    const floating = panel?.shadowRoot?.querySelector('wc-floating');
    return floating?.shadowRoot?.querySelector<HTMLElement>('.triggerContainer') ?? null;
}

export function closeUserPanel() {
    const walk = (root: ShadowRoot | Document): HTMLElement | null => {
        for (const element of Array.from(root.querySelectorAll('*'))) {
            if (element.tagName === 'WC-USER-PANEL-MODULES') {
                return element as HTMLElement;
            }
            const shadowRoot = (element as HTMLElement).shadowRoot;
            if (shadowRoot) {
                const found = walk(shadowRoot);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    };

    const modules = walk(document);
    if (modules) {
        modules.dispatchEvent(new CustomEvent('closePanel', {bubbles: true}));
    }
}

export function dispatchWcUserStatusUpdate(infomaniakUserId: number, status: string | undefined, scheduledAbsence: ScheduledAbsence | undefined) {
    const detail: WcUserStatusUpdateDetail = {
        id: infomaniakUserId,
        presence: {status: toWebComponentPresence(status)},
        scheduledAbsence: scheduledAbsence ? {
            start: scheduledAbsence.start,
            end: scheduledAbsence.end,
        } : null,
    };

    window.dispatchEvent(new CustomEvent(WC_EVENT_USER_STATUS_UPDATE, {detail}));
}

export function handleWcUserLogout() {
    const wcStore = (window as WebComponentsStore).webComponentsStore;
    const originalGoToLink = wcStore?.utils?.goToLink;
    if (wcStore?.utils && originalGoToLink) {
        wcStore.utils.goToLink = () => false;
        setTimeout(() => {
            wcStore.utils!.goToLink = originalGoToLink;
        }, 0);
    }

    emitUserLoggedOutEvent('ikLogout');
}
