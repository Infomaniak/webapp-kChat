// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-underscore-dangle */
/* eslint-disable react/no-children-prop */

import {render} from '@testing-library/react';
import React from 'react';

jest.mock('./list_item_size_observer', () => ({
    ListItemSizeObserver: {
        getInstance: jest.fn(() => ({
            observe: jest.fn(() => jest.fn()),
            unobserve: jest.fn(),
        })),
    },
}));

import DynamicVirtualizedList from './index';

describe('DynamicVirtualizedList', () => {
    const itemIds = ['a', 'b', 'c', 'd', 'e'];

    const mountList = (itemData = itemIds) => {
        const children = jest.fn(({itemId}: {itemId: string}) => (
            <div data-testid={`row-${itemId}`}>{itemId}</div>
        ));
        const onItemsRendered = jest.fn();
        const onScroll = jest.fn();
        const utils = render(
            <DynamicVirtualizedList
                canLoadMorePosts={jest.fn()}
                children={children as any}
                height={300}
                initRangeToRender={[]}
                initScrollToIndex={() => ({index: itemData.length - 1, position: 'end', offset: 0})}
                innerRef={React.createRef()}
                itemData={itemData}
                onItemsRendered={onItemsRendered}
                onScroll={onScroll}
                overscanCountBackward={1}
                overscanCountForward={1}
                width={300}
            />,
        );
        return {children, onItemsRendered, onScroll, ...utils};
    };

    test('reuses placeholder elements between renders (stable references)', () => {
        const listRef = React.createRef<DynamicVirtualizedList>();
        const {rerender} = render(
            <DynamicVirtualizedList
                canLoadMorePosts={jest.fn()}
                children={jest.fn(({itemId}: {itemId: string}) => <div>{itemId}</div>) as any}
                height={300}
                initRangeToRender={[]}
                initScrollToIndex={() => ({index: 0, position: 'end', offset: 0})}
                innerRef={React.createRef()}
                itemData={itemIds}
                onItemsRendered={jest.fn()}
                onScroll={jest.fn()}
                overscanCountBackward={1}
                overscanCountForward={1}
                ref={listRef}
                width={300}
            />,
        );

        const list = listRef.current!;
        const placeholderCache = list._placeholderCache as Record<string, React.ReactElement>;
        placeholderCache.b = React.createElement('div', {key: 'b', style: {left: 0, top: 0, height: 0, width: '100%'}});
        const cachedBefore = {...placeholderCache};
        expect(Object.keys(cachedBefore)).toContain('b');

        rerender(
            <DynamicVirtualizedList
                canLoadMorePosts={jest.fn()}
                children={jest.fn(({itemId}: {itemId: string}) => <div>{itemId}</div>) as any}
                height={300}
                initRangeToRender={[]}
                initScrollToIndex={() => ({index: 0, position: 'end', offset: 0})}
                innerRef={React.createRef()}
                itemData={itemIds}
                onItemsRendered={jest.fn()}
                onScroll={jest.fn()}
                overscanCountBackward={1}
                overscanCountForward={1}
                ref={listRef}
                width={300}
            />,
        );

        const placeholdersAfter = list._placeholderCache as Record<string, React.ReactElement>;
        for (const key of Object.keys(cachedBefore)) {
            expect(placeholdersAfter[key]).toBe(cachedBefore[key]);
        }
    });

    test('purges stale cache entries when itemData changes', () => {
        const listRef = React.createRef<DynamicVirtualizedList>();
        const {rerender} = render(
            <DynamicVirtualizedList
                canLoadMorePosts={jest.fn()}
                children={jest.fn(({itemId}: {itemId: string}) => <div>{itemId}</div>) as any}
                height={300}
                initRangeToRender={[]}
                initScrollToIndex={() => ({index: 0, position: 'end', offset: 0})}
                innerRef={React.createRef()}
                itemData={itemIds}
                onItemsRendered={jest.fn()}
                onScroll={jest.fn()}
                overscanCountBackward={1}
                overscanCountForward={1}
                ref={listRef}
                width={300}
            />,
        );

        const list = listRef.current!;
        const placeholderCache = list._placeholderCache as Record<string, React.ReactElement>;
        placeholderCache.a = React.createElement('div', {key: 'a', style: {left: 0, top: 0, height: 0, width: '100%'}});
        placeholderCache.stale = React.createElement('div', {key: 'stale', style: {left: 0, top: 0, height: 0, width: '100%'}});
        const styleCache = list._itemStyleCache as Record<string, React.CSSProperties>;
        styleCache.a = {left: 0, top: 0, height: 100, width: '100%'};
        styleCache.stale = {left: 0, top: 0, height: 100, width: '100%'};
        const meta = list._listMetaData;
        meta.itemSizeMap = {a: 100, stale: 100} as Record<string, number>;
        meta.itemOffsetMap = {a: 0, stale: 500} as Record<string, number>;

        rerender(
            <DynamicVirtualizedList
                canLoadMorePosts={jest.fn()}
                children={jest.fn(({itemId}: {itemId: string}) => <div>{itemId}</div>) as any}
                height={300}
                initRangeToRender={[]}
                initScrollToIndex={() => ({index: 0, position: 'end', offset: 0})}
                innerRef={React.createRef()}
                itemData={[...itemIds]}
                onItemsRendered={jest.fn()}
                onScroll={jest.fn()}
                overscanCountBackward={1}
                overscanCountForward={1}
                ref={listRef}
                width={300}
            />,
        );

        const placeholdersAfter = list._placeholderCache as Record<string, React.ReactElement>;
        expect(placeholdersAfter.stale).toBeUndefined();
        expect(placeholdersAfter.a).toBe(placeholderCache.a);
        const stylesAfter = list._itemStyleCache as Record<string, React.CSSProperties>;
        expect(stylesAfter.stale).toBeUndefined();
        expect(stylesAfter.a).toBe(styleCache.a);
        const sizesAfter = meta.itemSizeMap as Record<string, number>;
        expect(sizesAfter.stale).toBeUndefined();
        expect(sizesAfter.a).toBe(100);
        const offsetsAfter = meta.itemOffsetMap as Record<string, number>;
        expect(offsetsAfter.stale).toBeUndefined();
        expect(offsetsAfter.a).toBeDefined();
    });

    test('passes index to children', () => {
        const {children} = mountList();
        const calls = (children as jest.Mock).mock.calls;
        for (const [props] of calls) {
            expect(typeof props.index).toBe('number');
            expect(props.index).toBe(props.data.indexOf(props.itemId));
        }
    });

    test('findNearestItem returns the first visible index for a scroll offset', () => {
        const listRef = React.createRef<DynamicVirtualizedList>();
        render(
            <DynamicVirtualizedList
                canLoadMorePosts={jest.fn()}
                children={jest.fn(({itemId}: {itemId: string}) => <div>{itemId}</div>) as any}
                height={300}
                initRangeToRender={[]}
                initScrollToIndex={() => ({index: 0, position: 'end', offset: 0})}
                innerRef={React.createRef()}
                itemData={itemIds}
                onItemsRendered={jest.fn()}
                onScroll={jest.fn()}
                overscanCountBackward={1}
                overscanCountForward={1}
                ref={listRef}
                width={300}
            />,
        );

        const list = listRef.current!;
        const meta = list._listMetaData;
        meta.itemSizeMap = {a: 100, b: 100, c: 100, d: 100, e: 100} as Record<string, number>;
        list._generateOffsetMeasurements();

        const offsets = meta.itemOffsetMap as Record<string, number>;
        expect(offsets.a).toBe(400);
        expect(offsets.e).toBe(0);

        const startIndex = list._getRangeToRender(0);
        expect(startIndex[2]).toBe(4);
        const startIndexBottom = list._getRangeToRender(400);
        expect(startIndexBottom[2]).toBe(0);
    });
});
