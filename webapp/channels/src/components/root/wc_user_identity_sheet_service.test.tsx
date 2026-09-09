import {act} from '@testing-library/react';
import React from 'react';

import {CustomStatusDuration} from '@mattermost/types/users';

import {renderWithContext} from 'tests/react_testing_utils';

import type {UserIdentityConfig} from './wc_user_identity_sheet_service';
import {showUserIdentitySheet, WcUserIdentitySheetService} from './wc_user_identity_sheet_service';

describe('WcUserIdentitySheetService', () => {
    const mockOpen = jest.fn().mockResolvedValue(undefined);
    const mockClose = jest.fn().mockResolvedValue(undefined);

    beforeEach(() => {
        jest.clearAllMocks();

        if (!customElements.get('wc-identity-sheet')) {
            customElements.define('wc-identity-sheet', class extends HTMLElement {});
        }
    });

    const renderSheet = () => {
        renderWithContext(<WcUserIdentitySheetService/>);
        const sheet = document.querySelector('wc-identity-sheet') as HTMLElement & {open: jest.Mock; close: jest.Mock};
        if (sheet) {
            (sheet as any).open = mockOpen;
            (sheet as any).close = mockClose;
        }
        return sheet;
    };

    const show = (config: UserIdentityConfig) => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        act(() => {
            showUserIdentitySheet(config, trigger);
        });
        return trigger;
    };

    const waitForSheetUpdate = () => act(async () => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });

    test('showUserIdentitySheet should set props and call open on the sheet', async () => {
        renderSheet();

        const trigger = show({
            accountId: 42,
            badges: [],
            customStatus: {
                emoji: 'rocket',
                text: 'Test',
                duration: CustomStatusDuration.DONT_CLEAR,
                expires_at: '2026-09-01T10:00:00Z',
            },
            isUserGuest: false,
            shouldDisplayMinimalPanel: false,
            src: 'https://example.com/avatar.png',
            user: {
                id: '123',
                username: 'user',
                email: 'user@example.com',
                first_name: 'First',
                last_name: 'Last',
                is_bot: false,
            } as any,
            userStatus: 'online',
            username: 'user',
            userId: '123',
        });

        await waitForSheetUpdate();

        const updatedSheet = document.querySelector('wc-identity-sheet') as any;
        expect(updatedSheet.entityType).toBe('user');
        expect(updatedSheet.accountId).toBe(42);
        expect(updatedSheet.userPresence).toBe('online');
        expect(updatedSheet.userCustomStatusText).toBe('Test');
        expect(updatedSheet.userCustomStatusEmoji).toBe('rocket');
        expect(updatedSheet.userCustomStatusExpiresAt).toBe('2026-09-01T10:00:00Z');
        expect(updatedSheet.userAvatar).toBe('https://example.com/avatar.png');
        expect(updatedSheet.displayName).toBe('First Last');
        expect(updatedSheet.email).toBe('user@example.com');
        expect(updatedSheet.customTrigger).toBe(trigger);
        expect(mockOpen).toHaveBeenCalledWith({mode: 'click'});

        document.body.removeChild(trigger);
    });

    test('showUserIdentitySheet should hide presence with null for bot users', async () => {
        renderSheet();

        const trigger = show({
            accountId: 42,
            badges: [],
            isUserGuest: false,
            shouldDisplayMinimalPanel: false,
            user: {id: '123', is_bot: true} as any,
            userStatus: 'online',
            userId: '123',
        });

        await waitForSheetUpdate();

        const updatedSheet = document.querySelector('wc-identity-sheet') as any;
        expect(updatedSheet.userPresence).toBeNull();
        expect(updatedSheet.userCustomStatusText).toBeNull();
        expect(updatedSheet.userCustomStatusEmoji).toBeNull();
        expect(updatedSheet.userCustomStatusExpiresAt).toBeNull();
        expect(updatedSheet.hiddenInformations).toEqual(['userTimezone', 'email']);
        expect(updatedSheet.hiddenOptions).toEqual(['send-mail', 'search-incoming-mail', 'block-user', 'schedule-event', 'create-contact', 'start-call', 'manage-profile']);

        document.body.removeChild(trigger);
    });

    test('showUserIdentitySheet should clear entityId with null for minimal panel', async () => {
        renderSheet();

        const trigger = show({
            accountId: 42,
            badges: [],
            isUserGuest: false,
            shouldDisplayMinimalPanel: false,
            user: {id: '123', user_id: '123', username: 'user'} as any,
            userStatus: 'online',
            userId: '123',
        });

        await waitForSheetUpdate();

        const sheet = document.querySelector('wc-identity-sheet') as any;
        expect(sheet.entityId).toBe('123');

        const secondTrigger = show({
            accountId: 42,
            badges: [],
            isUserGuest: false,
            shouldDisplayMinimalPanel: true,
            user: {id: '123', username: 'webhook'} as any,
            userStatus: 'offline',
            userId: '123',
        });

        await waitForSheetUpdate();

        const updatedSheet = document.querySelector('wc-identity-sheet') as any;
        expect(updatedSheet.entityId).toBeNull();

        document.body.removeChild(trigger);
        document.body.removeChild(secondTrigger);
    });
});
