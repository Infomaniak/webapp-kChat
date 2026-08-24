// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react';
import React from 'react';

import {Locations} from 'utils/constants';

import {renderWithContext, userEvent} from 'tests/react_testing_utils';

import FormattingBar from './formatting_bar';
import {ALL_MARKDOWN_CONTROLS, useFormattingBarLayout} from './hooks';

jest.mock('./hooks', () => {
    const actual = jest.requireActual('./hooks');
    return {
        ...actual,
        useFormattingBarLayout: jest.fn(),
    };
});

const mockUseFormattingBarLayout = useFormattingBarLayout as jest.MockedFunction<typeof useFormattingBarLayout>;

describe('FormattingBar', () => {
    const baseProps = {
        getCurrentMessage: jest.fn(() => ''),
        getCurrentSelection: jest.fn(() => ({start: 0, end: 0})),
        applyMarkdown: jest.fn(),
        disableControls: false,
        location: Locations.CENTER,
    };

    afterEach(() => {
        mockUseFormattingBarLayout.mockReset();
    });

    test('should render hidden formatting button when visible count is less than total', () => {
        mockUseFormattingBarLayout.mockReturnValue({visibleCount: 1});

        renderWithContext(
            <FormattingBar {...baseProps}/>,
        );

        expect(screen.getByLabelText('show hidden formatting options')).toBeInTheDocument();
    });

    test('should render hidden formatting button when some controls are hidden', () => {
        mockUseFormattingBarLayout.mockReturnValue({visibleCount: 5});

        renderWithContext(
            <FormattingBar {...baseProps}/>,
        );

        expect(screen.getByLabelText('show hidden formatting options')).toBeInTheDocument();
    });

    test('should not render hidden formatting button when all controls are visible', () => {
        mockUseFormattingBarLayout.mockReturnValue({visibleCount: ALL_MARKDOWN_CONTROLS.length});

        renderWithContext(
            <FormattingBar {...baseProps}/>,
        );

        expect(screen.queryByLabelText('show hidden formatting options')).not.toBeInTheDocument();
    });

    test('MM-56705 should not submit form when clicking on hidden formatting button', () => {
        mockUseFormattingBarLayout.mockReturnValue({visibleCount: 3});

        const onSubmit = jest.fn();

        renderWithContext(
            <form onSubmit={onSubmit}>
                <FormattingBar {...baseProps}/>
            </form>,
        );

        expect(screen.queryByLabelText('heading')).toBe(null);

        userEvent.click(screen.getByLabelText('show hidden formatting options'));

        expect(screen.queryByLabelText('heading')).toBeVisible();
        expect(onSubmit).not.toHaveBeenCalled();
    });
});
