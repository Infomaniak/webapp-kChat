// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import type {ScheduledAbsence} from '@mattermost/types/users';

import {createSelector} from 'mattermost-redux/selectors/create_selector';

import type {GlobalState} from 'types/store';

export function getScheduledAbsenceForUserId(state: GlobalState, userId: string): ScheduledAbsence | undefined {
    return state.entities.users.scheduledAbsences[userId];
}

export function hasCurrentAbsenceForUserId(state: GlobalState, userId: string): boolean {
    const absence = getScheduledAbsenceForUserId(state, userId);
    if (!absence) {
        return false;
    }

    const now = Date.now();
    return absence.start <= now && now <= absence.end;
}

const computeCurrentAbsences = (now: number, absences: Record<string, ScheduledAbsence>): Record<string, boolean> => {
    return Object.fromEntries(
        Object.entries(absences).map(([userId, absence]) => [userId, absence.start <= now && now <= absence.end]),
    );
};

export const getCurrentAbsences = createSelector(
    'getCurrentAbsences',
    (state: GlobalState) => state.entities.users.scheduledAbsences,
    (absences) => computeCurrentAbsences(Date.now(), absences),
);
