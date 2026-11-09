// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-hooks';
import {useDispatch, useSelector} from 'react-redux';

import {fetchTeamScheduledAbsences} from 'actions/scheduled_absence_actions';

import {useWcAbsenceDialogController, useWcAbsenceModalSetup} from './wc_absence_dialog_hooks';
import type {WcMevEventCrudModalElement} from './wc_user_panel_platform';
import {
    WC_EVENT_CREATE_SCHEDULED_ABSENCE,
    WC_EVENT_OPEN_SCHEDULED_ABSENCE,
    closeUserPanel,
} from './wc_user_panel_platform';

jest.mock('./wc_user_panel_platform', () => ({
    WC_EVENT_CREATE_SCHEDULED_ABSENCE: 'createScheduledAbsence',
    WC_EVENT_OPEN_SCHEDULED_ABSENCE: 'openScheduledAbsence',
    closeUserPanel: jest.fn(),
}));

jest.mock('actions/scheduled_absence_actions', () => ({
    fetchTeamScheduledAbsences: jest.fn(() => ({type: 'RECEIVED_MOCK_ABSENCES'})),
}));

jest.mock('react-redux', () => ({
    useDispatch: jest.fn(),
    useSelector: jest.fn(),
}));

const fetchTeamScheduledAbsencesMock = fetchTeamScheduledAbsences as jest.Mock;
const useDispatchMock = useDispatch as jest.Mock;
const useSelectorMock = useSelector as jest.Mock;

describe('components/user_account_menu/wc_absence_dialog_hooks', () => {
    describe('useWcAbsenceDialogController', () => {
        const renderAndCreate = () => {
            const {result} = renderHook(() => useWcAbsenceDialogController());
            act(() => {
                window.dispatchEvent(new CustomEvent(WC_EVENT_CREATE_SCHEDULED_ABSENCE));
            });
            return result;
        };

        it('opens the dialog in create mode', () => {
            const result = renderAndCreate();

            expect(result.current.dialogState).toEqual({mode: 'create'});
        });

        it('opens the dialog in edit mode with the emitted absence uuid', () => {
            const result = renderAndCreate();

            act(() => {
                window.dispatchEvent(new CustomEvent(WC_EVENT_OPEN_SCHEDULED_ABSENCE, {detail: {uuid: 'absence-1'}}));
            });

            expect(result.current.dialogState).toEqual({mode: 'edit', absenceUuid: 'absence-1'});
            expect(closeUserPanel).toHaveBeenCalled();
        });

        it('ignores edit requests without a uuid', () => {
            const result = renderAndCreate();

            act(() => {
                window.dispatchEvent(new CustomEvent(WC_EVENT_OPEN_SCHEDULED_ABSENCE));
            });

            expect(result.current.dialogState).toEqual({mode: 'create'});
        });

        it('closes the dialog', () => {
            const result = renderAndCreate();

            act(() => {
                result.current.closeDialog();
            });

            expect(result.current.dialogState).toBeNull();
        });
    });

    describe('useWcAbsenceModalSetup', () => {
        const fakeDispatch = jest.fn();

        const renderSetup = (dialogState: {mode: 'create'} | null, element: WcMevEventCrudModalElement | null, onClosed = jest.fn()) => {
            const ref = {current: element};
            return renderHook(
                ({state, onClosedCallback}: {state: {mode: 'create'} | null; onClosedCallback: () => void}) => (
                    useWcAbsenceModalSetup(state, ref, onClosedCallback)
                ),
                {initialProps: {state: dialogState, onClosedCallback: onClosed}},
            );
        };

        beforeEach(() => {
            fakeDispatch.mockClear();
            fetchTeamScheduledAbsencesMock.mockClear();
            useDispatchMock.mockReturnValue(fakeDispatch);
            useSelectorMock.mockImplementation((selector: (state: unknown) => unknown) => selector({
                entities: {teams: {currentTeamId: 'team-1'}},
            }));
        });

        it('configures the web component modal when the dialog opens', () => {
            const element = document.createElement('div') as WcMevEventCrudModalElement;

            renderSetup({mode: 'create'}, element);

            expect(element.features).toEqual({event: false, eventPoll: false, absence: true});
            expect(element.disableLayoutAction).toBe(true);
            expect(element.disableMinimizeAction).toBe(true);
        });

        it('skips the setup while the dialog is closed', () => {
            const element = document.createElement('div') as WcMevEventCrudModalElement;

            renderSetup(null, element);

            expect(element.features).toBeUndefined();
            expect(element.disableLayoutAction).toBeUndefined();
            expect(element.disableMinimizeAction).toBeUndefined();
        });

        it('refreshes the absence data when the dialog opens', () => {
            const element = document.createElement('div') as WcMevEventCrudModalElement;
            const refreshSpy = jest.fn();
            element.refreshAbsences = refreshSpy;

            renderSetup({mode: 'create'}, element);

            expect(refreshSpy).toHaveBeenCalled();
        });

        it('does not refresh while the dialog is closed', () => {
            const element = document.createElement('div') as WcMevEventCrudModalElement;
            const refreshSpy = jest.fn();
            element.refreshAbsences = refreshSpy;

            renderSetup(null, element);

            expect(refreshSpy).not.toHaveBeenCalled();
        });

        it('refreshes the kChat absences and closes when the modal emits close', () => {
            const element = document.createElement('div') as WcMevEventCrudModalElement;
            const onClosed = jest.fn();

            renderSetup({mode: 'create'}, element, onClosed);

            act(() => {
                element.dispatchEvent(new CustomEvent('close'));
            });

            expect(fetchTeamScheduledAbsences).toHaveBeenCalledWith('team-1');
            expect(fakeDispatch).toHaveBeenCalledWith({type: 'RECEIVED_MOCK_ABSENCES'});
            expect(onClosed).toHaveBeenCalled();
        });
    });
});
