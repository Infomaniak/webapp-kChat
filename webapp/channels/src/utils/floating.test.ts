// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {detectOverflow} from '@floating-ui/react';
import type {MiddlewareState} from '@floating-ui/react-dom';

import {horizontallyWithin} from 'utils/floating';

jest.mock('@floating-ui/react', () => ({
    detectOverflow: jest.fn(),
}));

const detectOverflowMock = jest.mocked(detectOverflow);
const state = {} as unknown as MiddlewareState;

describe('horizontallyWithin', () => {
    beforeEach(() => {
        detectOverflowMock.mockReset().mockResolvedValue({right: 0, left: 0, top: 0, bottom: 0});
    });

    it('returns {} and skips detectOverflow when the boundary getter returns null', async () => {
        const middleware = horizontallyWithin({boundary: () => null});

        expect(await middleware.fn(state)).toEqual({});
        expect(detectOverflowMock).not.toHaveBeenCalled();
    });

    it('resolves the boundary getter at compute time', async () => {
        const firstElement = document.createElement('div');
        const secondElement = document.createElement('div');
        let boundary: Element | null = firstElement;

        const middleware = horizontallyWithin({boundary: () => boundary});

        await middleware.fn(state);
        expect(detectOverflowMock).toHaveBeenLastCalledWith(state, {boundary: firstElement});

        boundary = secondElement;
        await middleware.fn(state);
        expect(detectOverflowMock).toHaveBeenLastCalledWith(state, {boundary: secondElement});
    });

    it('shifts the floating element left when it overflows on the right', async () => {
        detectOverflowMock.mockResolvedValue({right: 50, left: 0, top: 0, bottom: 0});

        const middleware = horizontallyWithin({boundary: () => document.createElement('div')});

        expect(await middleware.fn({...state, x: 10} as unknown as MiddlewareState)).toEqual({x: -40, y: undefined});
    });
});
