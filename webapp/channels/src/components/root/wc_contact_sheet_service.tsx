import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';

import type {UserProfile} from '@mattermost/types/users';

import {isAnyModalOpen} from 'selectors/views/modals';

import {useWebComponent} from 'components/common/hooks/useWebComponent';

import {getHistory} from 'utils/browser_history';
import {isDesktopApp} from 'utils/user_agent';

export interface ContactSheetConfig {
    accountId: number;
    badges: string[];
    customContent?: React.ReactNode;
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

export interface WcContactSheetElement extends HTMLElement {
    open(options?: {mode: 'click' | 'hover'}): Promise<void>;
    close(): Promise<void>;
    hiddenOptions: string[];
    hiddenInformations: string[];
    customTrigger: HTMLElement | null;
    accountId: number;
    isExternal: boolean;
    kChatTeamName: string;
    kChatUserName: string;
    copiableUserId: string;
    presence: string | undefined;
    src: string | undefined;
    timezone: string | undefined;
    userId: string | number | undefined;
    userMail: string | undefined;
    userName: string | undefined;
    project: 'kchat';
}

let showFn: ((config: ContactSheetConfig, trigger: HTMLElement) => void) | null = null;

export function showContactSheet(config: ContactSheetConfig, trigger: HTMLElement) {
    if (showFn) {
        showFn(config, trigger);
    } else {
        // eslint-disable-next-line no-console
        console.warn('WcContactSheetService: not ready — cannot show contact sheet');
    }
}

export function WcContactSheetService() {
    const {ref: sheetRef, isReady} = useWebComponent<WcContactSheetElement>('wc-contact-sheet');
    const latestConfig = useRef<ContactSheetConfig | null>(null);
    const [config, setConfig] = useState<ContactSheetConfig | null>(null);
    const anyModalOpen = useSelector(isAnyModalOpen);

    const handleShow = useCallback((newConfig: ContactSheetConfig, trigger: HTMLElement) => {
        latestConfig.current = newConfig;
        setConfig(newConfig);

        requestAnimationFrame(() => {
            const el = sheetRef.current;
            if (!el) {
                return;
            }

            el.accountId = newConfig.accountId;
            el.isExternal = newConfig.isUserGuest;
            el.kChatTeamName = newConfig.teamName ?? '';
            el.kChatUserName = newConfig.username ?? '';
            el.copiableUserId = newConfig.userId;

            const isBotOrDeactivated = newConfig.user?.is_bot || Boolean(newConfig.user?.delete_at);

            el.presence = (newConfig.hideStatus || isBotOrDeactivated) ? undefined : newConfig.userStatus;
            el.src = newConfig.overwriteIcon || newConfig.src;
            el.timezone = newConfig.user?.timezone?.useAutomaticTimezone ? newConfig.user?.timezone.automaticTimezone : newConfig.user?.timezone?.manualTimezone;
            el.userId = newConfig.shouldDisplayMinimalPanel ? undefined : newConfig.user?.user_id;
            el.userMail = newConfig.user?.is_bot ? `@${newConfig.username}` : newConfig.user?.email;
            el.userName = newConfig.overwriteName || [
                newConfig.user?.first_name,
                newConfig.user?.last_name,
            ].filter(Boolean).join(' ') || newConfig.username;

            if (isBotOrDeactivated) {
                el.hiddenInformations = ['userTimezone', 'email'];
                el.hiddenOptions = ['send-mail', 'search-incoming-mail', 'block-user', 'schedule-event', 'create-contact', 'show-contact', 'start-call', 'manage-profile'];
            } else {
                el.hiddenInformations = [];
                el.hiddenOptions = [];
            }

            el.customTrigger = trigger;
            el.open({mode: 'click'}).catch((err) => {
                // eslint-disable-next-line no-console
                console.error('WcContactSheetService: failed to open sheet', err);
            });
        });
    }, [sheetRef]);

    const showRef = useRef(handleShow);
    showRef.current = handleShow;

    useEffect(() => {
        if (isReady) {
            showFn = (config, trigger) => showRef.current(config, trigger);
        } else {
            showFn = null;
        }
        return () => {
            showFn = null;
        };
    }, [isReady]);

    useEffect(() => {
        if (!isReady) {
            return undefined;
        }

        const el = sheetRef.current;
        if (!el) {
            return undefined;
        }

        const handleQuickActionClick = (e: CustomEvent) => {
            const {action, user} = e.detail ?? {};
            const values = latestConfig.current;

            if (!values || !action) {
                return;
            }

            if (action.id === 'send-kchat') {
                getHistory().push(`/${values.teamName}/messages/@${values.username}`);
                e.preventDefault();
                // eslint-disable-next-line no-console
                el.close().catch((err) => console.error('WcContactSheetService: failed to close sheet', err));
                return;
            }

            if (action.id === 'start-call') {
                getHistory().push(`/${values.teamName}/messages/@${values.user?.username}?call=true`);
                e.preventDefault();
                // eslint-disable-next-line no-console
                el.close().catch((err) => console.error('WcContactSheetService: failed to close sheet', err));
                return;
            }

            if (isDesktopApp() && ['send-mail', 'search-incoming-mail'].includes(action.id)) {
                e.preventDefault();
                const href = action.computeHref?.(user);
                if (href && href.startsWith('https:')) {
                    window.open(href, '_blank');
                }
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
                    console.error('WcContactSheetService: failed to close sheet', err);
                });
            }
        }
    }, [anyModalOpen, isReady]);

    return (
        <div style={{position: 'absolute', left: '-9999px', pointerEvents: 'none'}}>
            <wc-contact-sheet
                project='kchat'
                ref={sheetRef}
                prevent-open-on-hover={true}
                prevent-stop-propagation={true}
                size={'md'}
                background-color={'transparent'}
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
            </wc-contact-sheet>
        </div>
    );
}
