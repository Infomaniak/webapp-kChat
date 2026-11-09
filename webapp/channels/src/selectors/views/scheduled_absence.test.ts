// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import type {ScheduledAbsence} from '@mattermost/types/users';

import {UserTypes} from 'mattermost-redux/action_types';

import {getScheduledAbsenceForUserId, hasCurrentAbsenceForUserId} from 'selectors/views/scheduled_absence';
import configureStore from 'store';

describe('getScheduledAbsenceForUserId', () => {
    const absence: ScheduledAbsence = {start: Date.now(), end: Date.now() + 3600_000};

    it('should return undefined when the user has no scheduled absence', async () => {
        const store = await configureStore();
        expect(getScheduledAbsenceForUserId(store.getState(), 'user_id')).toBeUndefined();
    });

    it('should return the scheduled absence when the user has one', async () => {
        const store = await configureStore();
        store.dispatch({type: UserTypes.RECEIVED_SCHEDULED_ABSENCES, data: {user_id: absence}});
        expect(getScheduledAbsenceForUserId(store.getState(), 'user_id')).toEqual(absence);
    });
});

describe('hasCurrentAbsenceForUserId', () => {
    it('should return false when the user has no scheduled absence', async () => {
        const store = await configureStore();
        expect(hasCurrentAbsenceForUserId(store.getState(), 'user_id')).toBe(false);
    });

    it('should return true when the scheduled absence is ongoing', async () => {
        const store = await configureStore();
        store.dispatch({
            type: UserTypes.RECEIVED_SCHEDULED_ABSENCES,
            data: {user_id: {start: Date.now() - 3600_000, end: Date.now() + 3600_000}},
        });
        expect(hasCurrentAbsenceForUserId(store.getState(), 'user_id')).toBe(true);
    });

    it('should return false when the scheduled absence has not started yet', async () => {
        const store = await configureStore();
        store.dispatch({
            type: UserTypes.RECEIVED_SCHEDULED_ABSENCES,
            data: {user_id: {start: Date.now() + 3600_000, end: Date.now() + 7200_000}},
        });
        expect(hasCurrentAbsenceForUserId(store.getState(), 'user_id')).toBe(false);
    });

    it('should return false when the scheduled absence has ended', async () => {
        const store = await configureStore();
        store.dispatch({
            type: UserTypes.RECEIVED_SCHEDULED_ABSENCES,
            data: {user_id: {start: Date.now() - 7200_000, end: Date.now() - 3600_000}},
        });
        expect(hasCurrentAbsenceForUserId(store.getState(), 'user_id')).toBe(false);
    });
});
