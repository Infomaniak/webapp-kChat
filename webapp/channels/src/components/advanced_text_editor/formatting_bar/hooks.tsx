// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import debounce from 'lodash/debounce';
import type React from 'react';
import {useCallback, useLayoutEffect, useMemo, useState} from 'react';

import type {MarkdownMode} from 'utils/markdown/apply_markdown';

export const ICON_WIDTH = 32;
export const ICON_GAP = 2;
export const ICON_STEP = ICON_WIDTH + ICON_GAP;
export const CONTAINER_PADDING = 7;
export const DEFAULT_MIN_GAP = 48;

export const ALL_MARKDOWN_CONTROLS: MarkdownMode[] = ['bold', 'italic', 'strike', 'heading', 'link', 'code', 'quote', 'ul', 'ol'];

export const useFormattingBarLayout = (
    containerRef: React.RefObject<HTMLDivElement>,
    rightRef: React.RefObject<HTMLDivElement>,
    leftItemsCount: number,
    minGap: number = DEFAULT_MIN_GAP,
): {visibleCount: number} => {
    const [visibleCount, setVisibleCount] = useState(leftItemsCount);

    const computeVisible = useCallback(() => {
        const containerEl = containerRef.current;
        const rightEl = rightRef.current;
        if (!containerEl) {
            return;
        }
        const rightWidth = rightEl ? rightEl.offsetWidth : 0;
        const available = containerEl.clientWidth - rightWidth - minGap - CONTAINER_PADDING;
        const maxVisible = available > 0 ? Math.floor(available / ICON_STEP) : 0;
        setVisibleCount(Math.min(leftItemsCount, maxVisible));
    }, [containerRef, rightRef, leftItemsCount, minGap]);

    const handleResize = useMemo(() => debounce(computeVisible, 10), [computeVisible]);

    useLayoutEffect(() => {
        if (!containerRef.current) {
            return () => {};
        }
        computeVisible();
        const observer = new ResizeObserver(handleResize);
        observer.observe(containerRef.current);
        if (rightRef.current) {
            observer.observe(rightRef.current);
        }
        return () => {
            observer.disconnect();
            handleResize.cancel();
        };
    }, [handleResize, computeVisible, containerRef, rightRef]);

    return {visibleCount};
};
