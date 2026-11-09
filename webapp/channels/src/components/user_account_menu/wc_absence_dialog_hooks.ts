// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useCallback, useEffect, useState} from 'react';
import type {RefObject} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {getCurrentTeamId} from 'mattermost-redux/selectors/entities/teams';

import {fetchTeamScheduledAbsences} from 'actions/scheduled_absence_actions';

import type {ScheduledAbsenceEditRequestDetail, WcMevEventCrudModalElement} from './wc_user_panel_platform';
import {
    WC_EVENT_CREATE_SCHEDULED_ABSENCE,
    WC_EVENT_OPEN_SCHEDULED_ABSENCE,
    closeUserPanel,
} from './wc_user_panel_platform';

type WcAbsenceDialogState = {
    mode: 'create' | 'edit';
    absenceUuid?: string;
};

export function useWcAbsenceDialogController(): {dialogState: WcAbsenceDialogState | null; closeDialog: () => void} {
    const [dialogState, setDialogState] = useState<WcAbsenceDialogState | null>(null);
    const closeDialog = useCallback(() => setDialogState(null), []);

    useEffect(() => {
        const handleCreateScheduledAbsence = () => {
            setDialogState({mode: 'create'});
        };
        const handleEditScheduledAbsence = (event: Event) => {
            const {uuid} = (event as CustomEvent<ScheduledAbsenceEditRequestDetail>).detail ?? {};
            if (uuid) {
                closeUserPanel();
                setDialogState({mode: 'edit', absenceUuid: uuid});
            }
        };
        window.addEventListener(WC_EVENT_CREATE_SCHEDULED_ABSENCE, handleCreateScheduledAbsence);
        window.addEventListener(WC_EVENT_OPEN_SCHEDULED_ABSENCE, handleEditScheduledAbsence);
        return () => {
            window.removeEventListener(WC_EVENT_CREATE_SCHEDULED_ABSENCE, handleCreateScheduledAbsence);
            window.removeEventListener(WC_EVENT_OPEN_SCHEDULED_ABSENCE, handleEditScheduledAbsence);
        };
    }, []);

    return {dialogState, closeDialog};
}

export function useWcAbsenceModalSetup(
    dialogState: WcAbsenceDialogState | null,
    dialogRef: RefObject<WcMevEventCrudModalElement | null>,
    onClosed: () => void,
) {
    const dispatch = useDispatch();
    const currentTeamId = useSelector(getCurrentTeamId);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialogState || !dialog) {
            return undefined;
        }
        dialog.features = {event: false, eventPoll: false, absence: true};
        dialog.disableLayoutAction = true;
        dialog.disableMinimizeAction = true;
        const handleClose = () => {
            if (currentTeamId) {
                dispatch(fetchTeamScheduledAbsences(currentTeamId));
            }
            onClosed();
        };
        dialog.addEventListener('close', handleClose);
        return () => dialog.removeEventListener('close', handleClose);
    }, [dialogState, currentTeamId, dispatch, onClosed, dialogRef]);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialogState || !dialog) {
            return;
        }
        dialog.refreshAbsences?.();
    }, [dialogState, dialogRef]);
}
