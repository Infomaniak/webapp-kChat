// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {useSelector} from 'react-redux';

import {getCurrentUser} from 'mattermost-redux/selectors/entities/users';

import {useWcAbsenceDialogController, useWcAbsenceModalSetup} from './wc_absence_dialog_hooks';
import {getInfomaniakUserId} from './wc_user_panel_platform';
import type {WcMevEventCrudModalElement} from './wc_user_panel_platform';

import './wc_absence_dialog.css';

export default function WcAbsenceDialog() {
    const {dialogState, closeDialog} = useWcAbsenceDialogController();
    const currentUser = useSelector(getCurrentUser);
    const infomaniakUserId = getInfomaniakUserId(currentUser);
    const dialogRef = useRef<WcMevEventCrudModalElement | null>(null);
    useWcAbsenceModalSetup(dialogState, dialogRef, closeDialog);

    const handleBackdropClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            closeDialog();
        }
    }, [closeDialog]);

    if (!infomaniakUserId) {
        return null;
    }

    const isOpened = dialogState !== null;

    return (
        <div
            className={`wcUserPanel__absenceDialogBackdrop${isOpened ? '' : ' wcUserPanel__absenceDialogBackdrop--closed'}`}
            onClick={handleBackdropClick}
        >
            <div className='wcUserPanel__absenceDialog'>
                <wc-mev-event-crud-modal-view
                    ref={dialogRef}
                    standalone='absence'
                    mode={dialogState?.mode ?? 'create'}
                    tab='absence'
                    absence-uuid={dialogState?.absenceUuid}
                    user-id={infomaniakUserId}
                    is-opened={isOpened}
                />
            </div>
        </div>
    );
}
