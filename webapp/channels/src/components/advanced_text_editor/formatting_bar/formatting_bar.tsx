// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useFloating, offset, useClick, useDismiss, useInteractions} from '@floating-ui/react';
import {DotsHorizontalIcon} from '@infomaniak/compass-icons/components';
import classNames from 'classnames';
import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {CSSTransition} from 'react-transition-group';
import styled from 'styled-components';

import type {ApplyMarkdownOptions, MarkdownMode} from 'utils/markdown/apply_markdown';

import FormattingIcon, {IconContainer} from './formatting_icon';
import {ALL_MARKDOWN_CONTROLS, useFormattingBarLayout} from './hooks';

export const Separator = styled.div`
    display: block;
    position: relative;
    width: 1px;
    height: 24px;
    flex-shrink: 0;
    background: rgba(var(--center-channel-color-rgb), 0.16);
`;

export const FormattingBarSpacer = styled.div`
    display: flex;
    height: 48px;
    transition: height 0.25s ease;
    align-items: end;
    background: var(--center-channel-bg);
`;

const FormattingBarContainer = styled.div<{ $collapsed: boolean }>`
    display: flex;
    width: 100%;
    height: ${(props) => {
        return props.$collapsed ? 0 : 48;
    }}px;
    padding-left: 7px;
    background: transparent;
    align-items: center;
    gap: 2px;
    transform-origin: top;
    transition: height 0.25s ease;
`;

const LeftControls = styled.div`
    display: flex;
    align-items: center;
    gap: 2px;
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
`;

const HiddenControlsContainer = styled.div`
    padding: 5px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-radius: 4px;
    border: 1px solid rgba(var(--center-channel-color-rgb), 0.16);
    background: var(--center-channel-bg);
    z-index: -1;

    transition: transform 250ms ease, opacity 250ms ease;
    transform: scale(0);
    opacity: 0;
    display: flex;

    &.scale-enter {
        transform: scale(0);
        opacity: 0;
        z-index: 20;
    }

    &.scale-enter-active {
        transform: scale(1);
        opacity: 1;
        z-index: 20;
    }

    &.scale-enter-done {
        transform: scale(1);
        opacity: 1;
        z-index: 20;
    }

    &.scale-exit {
        transform: scale(1);
        opacity: 1;
        z-index: 20;
    }

    &.scale-exit-active {
        transform: scale(0);
        opacity: 0;
        z-index: 20;
    }

    &.scale-exit-done {
        transform: scale(0);
        opacity: 0;
        z-index: -1;
    }
`;

interface FormattingBarProps {
    getCurrentMessage: () => string;
    getCurrentSelection: () => {start: number; end: number};
    applyMarkdown: (options: ApplyMarkdownOptions) => void;
    disableControls: boolean;
    location: string;
    additionalControls?: React.ReactNodeArray;
    pinnedControls?: React.ReactNodeArray;
    rightActionsRef?: React.RefObject<HTMLDivElement>;
    minGap?: number;
    showLeftControls?: boolean;
}

type LeftItem =
    | {type: 'markdown'; mode: MarkdownMode; key: string}
    | {type: 'additional'; control: React.ReactNode; key: string}
    | {type: 'separator'; key: string};

const FormattingBar = (props: FormattingBarProps): JSX.Element => {
    const {
        applyMarkdown,
        getCurrentSelection,
        getCurrentMessage,
        disableControls,
        location,
        additionalControls,
        pinnedControls,
        rightActionsRef: externalRightRef,
        minGap,
        showLeftControls = true,
    } = props;
    const [showHiddenControls, setShowHiddenControls] = useState(false);
    const formattingBarRef = useRef<HTMLDivElement>(null);
    const internalRightRef = useRef<HTMLDivElement>(null);
    const rightActionsRef = externalRightRef || internalRightRef;

    const additionalItems = (additionalControls || []).map((control, i) => ({type: 'additional' as const, control, key: `add-${i}`}));
    const pinnedItems = (pinnedControls || []).map((control, i) => ({type: 'additional' as const, control, key: `pin-${i}`}));

    const collapsibleItems: LeftItem[] = [
        ...ALL_MARKDOWN_CONTROLS.map((mode) => ({type: 'markdown' as const, mode, key: mode})),
        ...(additionalItems.length > 0 ? [{type: 'separator' as const, key: 'add-sep'}] : []),
        ...additionalItems,
    ];

    const leftItems: LeftItem[] = [
        ...collapsibleItems,
        ...(pinnedItems.length > 0 ? [{type: 'separator' as const, key: 'pin-sep'}] : []),
        ...pinnedItems,
    ];

    const {visibleCount} = useFormattingBarLayout(formattingBarRef, rightActionsRef, leftItems.length, minGap);

    const {formatMessage} = useIntl();
    const HiddenControlsButtonAriaLabel = formatMessage({id: 'accessibility.button.hidden_controls_button', defaultMessage: 'show hidden formatting options'});

    const {x, y, strategy, update, context, refs: {setReference, setFloating}} = useFloating<HTMLButtonElement>({
        open: showHiddenControls,
        onOpenChange: setShowHiddenControls,
        placement: 'top',
        middleware: [offset({mainAxis: 4})],
    });

    const click = useClick(context);
    const {getReferenceProps: getClickReferenceProps, getFloatingProps: getClickFloatingProps} = useInteractions([
        click,
    ]);

    const dismiss = useDismiss(context);
    const {getReferenceProps: getDismissReferenceProps, getFloatingProps: getDismissFloatingProps} = useInteractions([
        dismiss,
    ]);

    useEffect(() => {
        update?.();
    }, [visibleCount, update, showHiddenControls]);

    const hasHiddenControls = visibleCount < collapsibleItems.length;

    const makeFormattingHandler = useCallback((mode: MarkdownMode) => () => {
        if (disableControls) {
            return;
        }

        const {start, end} = getCurrentSelection();

        if (start === null || end === null) {
            return;
        }

        const value = getCurrentMessage();

        applyMarkdown({
            markdownMode: mode,
            selectionStart: start,
            selectionEnd: end,
            message: value,
        });

        if (showHiddenControls) {
            setShowHiddenControls(!showHiddenControls);
        }
    }, [getCurrentSelection, getCurrentMessage, applyMarkdown, showHiddenControls, disableControls]);

    const hiddenControlsContainerStyles: React.CSSProperties = {
        position: strategy,
        top: y ?? 0,
        left: x ?? 0,
    };

    const trimSeparators = (items: LeftItem[]) => {
        let start = 0;
        let end = items.length;
        while (start < end && items[start].type === 'separator') {
            start++;
        }
        while (end > start && items[end - 1].type === 'separator') {
            end--;
        }
        return items.slice(start, end);
    };

    const pinnedCount = pinnedItems.length + (pinnedItems.length > 0 ? 1 : 0);
    const collapsibleVisible = Math.min(collapsibleItems.length, Math.max(0, visibleCount - pinnedCount));
    const visibleCollapsible = trimSeparators(collapsibleItems.slice(0, collapsibleVisible));
    const hiddenCollapsible = trimSeparators(collapsibleItems.slice(collapsibleVisible));
    const showPinned = visibleCount > 0 && pinnedItems.length > 0;

    const renderLeftItem = (item: LeftItem) => {
        if (item.type === 'separator') {
            return <Separator key={item.key}/>;
        }
        if (item.type === 'additional') {
            return <React.Fragment key={item.key}>{item.control}</React.Fragment>;
        }
        return (
            <FormattingIcon
                key={item.key}
                mode={item.mode}
                className='control'
                onClick={makeFormattingHandler(item.mode)}
                disabled={disableControls}
            />
        );
    };

    return (
        <FormattingBarContainer
            ref={formattingBarRef}
            $collapsed={!showLeftControls}
            data-testid='formattingBarContainer'
        >
            <LeftControls>
                {showLeftControls && (<>
                    {visibleCollapsible.map(renderLeftItem)}

                    {showPinned && (
                        <>
                            {visibleCollapsible.length > 0 && visibleCollapsible[visibleCollapsible.length - 1].type !== 'separator' && <Separator/>}
                            {pinnedItems.map(renderLeftItem)}
                        </>
                    )}

                    {hasHiddenControls && (
                        <>
                            {(visibleCollapsible.length > 0 || showPinned) && <Separator/>}
                            <IconContainer
                                id={'HiddenControlsButton' + location}
                                ref={setReference as React.Ref<HTMLButtonElement>}
                                className={classNames({active: showHiddenControls})}
                                aria-label={HiddenControlsButtonAriaLabel}
                                type='button'
                                {...getClickReferenceProps()}
                                {...getDismissReferenceProps()}
                            >
                                <DotsHorizontalIcon
                                    color={'currentColor'}
                                    size={18}
                                />
                            </IconContainer>
                        </>
                    )}
                </>)}
            </LeftControls>

            <CSSTransition
                timeout={250}
                classNames='scale'
                in={showHiddenControls}
                unmountOnExit={true}
            >
                <HiddenControlsContainer
                    ref={setFloating}
                    style={hiddenControlsContainerStyles}
                    {...getClickFloatingProps()}
                    {...getDismissFloatingProps()}
                >
                    {hiddenCollapsible.map(renderLeftItem)}
                </HiddenControlsContainer>
            </CSSTransition>
        </FormattingBarContainer>
    );
};

export default memo(FormattingBar);
