import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';

import type {UserCustomStatus, UserProfile} from '@mattermost/types/users';

import {isAnyModalOpen} from 'selectors/views/modals';

import {useWebComponent} from 'components/common/hooks/useWebComponent';

import {getHistory} from 'utils/browser_history';
import {isDesktopApp} from 'utils/user_agent';

import type {WcIdentitySheetElement} from './wc_identity_sheet_service';

export interface UserIdentityConfig {
    accountId: number;
    badges: string[];
    customContent?: React.ReactNode;
    customStatus?: UserCustomStatus;
    hideStatus?: boolean;
    isUserGuest: boolean;
    overwriteIcon?: string;
    overwriteName?: string;
    shouldDisplayMinimalPanel: boolean;
    src?: string;
    teamName?: string;
    user?: UserProfile;
    userStatus: string;
    username?: string;
    userId: string;
    returnFocus?: () => void;
}

export interface WcUserIdentitySheetElement extends WcIdentitySheetElement {
    email?: string | null;
    userAvatar?: string | null;
    userPresence?: string | null;
    userCustomStatusText?: string | null;
    userCustomStatusEmoji?: string | null;
    userCustomStatusExpiresAt?: string | null;
    userKChatTeamName?: string;
    userKChatUserName?: string;
    userTimezone?: string | null;
    userIsExternal?: boolean;
    copiableUserId?: string;
    hiddenOptions: string[];
    hiddenInformations: string[];
}

let showFn: ((config: UserIdentityConfig, trigger: HTMLElement) => void) | null = null;

export function showUserIdentitySheet(config: UserIdentityConfig, trigger: HTMLElement) {
    if (showFn) {
        showFn(config, trigger);
    } else {
        // eslint-disable-next-line no-console
        console.warn('WcUserIdentitySheetService: not ready — cannot show identity sheet');
    }
}

export function WcUserIdentitySheetService() {
    const {ref: sheetRef, isReady} = useWebComponent<WcUserIdentitySheetElement>('wc-identity-sheet');
    const latestConfig = useRef<UserIdentityConfig | null>(null);
    const [config, setConfig] = useState<UserIdentityConfig | null>(null);
    const anyModalOpen = useSelector(isAnyModalOpen);

    const handleShow = useCallback((newConfig: UserIdentityConfig, trigger: HTMLElement) => {
        latestConfig.current = newConfig;
        setConfig(newConfig);

        requestAnimationFrame(() => {
            const el = sheetRef.current;
            if (!el) {
                return;
            }

            el.entityType = 'user';
            el.accountId = newConfig.accountId;
            el.userIsExternal = newConfig.isUserGuest;
            el.userKChatTeamName = newConfig.teamName ?? '';
            el.userKChatUserName = newConfig.username ?? '';
            el.copiableUserId = newConfig.userId;

            const isBotOrDeactivated = newConfig.user?.is_bot || Boolean(newConfig.user?.delete_at);

            el.userPresence = (newConfig.hideStatus || isBotOrDeactivated) ? null : newConfig.userStatus;
            el.userCustomStatusText = newConfig.customStatus?.text ?? null;
            el.userCustomStatusEmoji = newConfig.customStatus?.emoji ?? null;
            el.userCustomStatusExpiresAt = newConfig.customStatus?.expires_at ?? null;
            el.userAvatar = (newConfig.overwriteIcon || newConfig.src) ?? null;
            el.userTimezone = (newConfig.user?.timezone?.useAutomaticTimezone ? newConfig.user?.timezone.automaticTimezone : newConfig.user?.timezone?.manualTimezone) ?? null;
            el.entityId = newConfig.shouldDisplayMinimalPanel ? null : (newConfig.user?.user_id ?? null);
            el.email = (newConfig.user?.is_bot ? `@${newConfig.username}` : newConfig.user?.email) ?? null;
            el.displayName = (newConfig.overwriteName || [
                newConfig.user?.first_name,
                newConfig.user?.last_name,
            ].filter(Boolean).join(' ') || newConfig.username) ?? null;

            if (isBotOrDeactivated) {
                el.hiddenInformations = ['userTimezone', 'email'];
                el.hiddenOptions = ['send-mail', 'search-incoming-mail', 'block-user', 'schedule-event', 'create-contact', 'start-call', 'manage-profile'];
            } else {
                el.hiddenInformations = [];
                el.hiddenOptions = [];
            }

            el.customTrigger = trigger;
            el.open({mode: 'click'}).catch((err) => {
                // eslint-disable-next-line no-console
                console.error('WcUserIdentitySheetService: failed to open sheet', err);
            });
        });
    }, [sheetRef]);

    useEffect(() => {
        if (isReady) {
            showFn = handleShow;
        } else {
            showFn = null;
        }
        return () => {
            showFn = null;
        };
    }, [isReady, handleShow]);

    useEffect(() => {
        if (!isReady) {
            return undefined;
        }

        const el = sheetRef.current;
        if (!el) {
            return undefined;
        }

        const handleQuickActionClick = (e: CustomEvent) => {
            const {action, entity} = e.detail ?? {};
            const values = latestConfig.current;

            if (!values || !action || entity?.type !== 'user') {
                return;
            }

            if (action.id === 'send-kchat') {
                getHistory().push(`/${values.teamName}/messages/@${values.username}`);
                e.preventDefault();
                // eslint-disable-next-line no-console
                el.close().catch((err) => console.error('WcUserIdentitySheetService: failed to close sheet', err));
                return;
            }

            if (action.id === 'start-call') {
                if (!values.user?.username) {
                    return;
                }
                getHistory().push(`/${values.teamName}/messages/@${values.user?.username}?call=true`);
                e.preventDefault();
                // eslint-disable-next-line no-console
                el.close().catch((err) => console.error('WcUserIdentitySheetService: failed to close sheet', err));
                return;
            }

            if (isDesktopApp() && ['send-mail', 'search-incoming-mail'].includes(action.id)) {
                e.preventDefault();
                const href = action.computeHref?.(entity);
                if (href && href.startsWith('https:')) {
                    window.open(href, '_blank');
                }
                // eslint-disable-next-line no-console
                el.close().catch((err) => console.error('WcUserIdentitySheetService: failed to close sheet', err));
            }
        };

        const handleClose = () => latestConfig.current?.returnFocus?.();

        el.addEventListener('close', handleClose);
        el.addEventListener('idshQuickActionClick', handleQuickActionClick as EventListenerOrEventListenerObject);

        return () => {
            el.removeEventListener('close', handleClose);
            el.removeEventListener('idshQuickActionClick', handleQuickActionClick as EventListenerOrEventListenerObject);
        };
    }, [isReady, sheetRef]);

    useEffect(() => {
        if (anyModalOpen && isReady) {
            const el = sheetRef.current;
            if (el && typeof el.close === 'function') {
                el.close().catch((err) => {
                    // eslint-disable-next-line no-console
                    console.error('WcUserIdentitySheetService: failed to close sheet', err);
                });
            }
        }
    }, [anyModalOpen, isReady]);

    return (
        <div style={{position: 'absolute', left: '-9999px', pointerEvents: 'none'}}>
            <wc-identity-sheet
                class='wc-user-identity-sheet'
                entity-type={'user'}
                project='kchat'
                ref={sheetRef}
                prevent-open-on-hover={true}
                prevent-stop-propagation={true}
                avatar-size={'md'}
                user-avatar-background-color={'transparent'}
            >
                {config?.badges.map((badge, idx) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <wc-pill
                        key={idx}
                        slot='custom-badges'
                        style={{
                            color: 'var(--wc-contact-sheet-pill-color)',
                            '--wc-pill-background': 'var(--wc-contact-sheet-pill-background-color)',
                        } as React.CSSProperties}
                        size='small'
                        round={true}
                        prevent-removal={true}
                    >
                        {badge}
                    </wc-pill>
                ))}
                {config?.customContent}
            </wc-identity-sheet>
        </div>
    );
}
