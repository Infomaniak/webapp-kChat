// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import type {TeamMembership} from '@mattermost/types/teams';
import type {ScheduledAbsence} from '@mattermost/types/users';

import {Client4} from 'mattermost-redux/client';

import configureStore from 'store';

import {fetchTeamScheduledAbsences} from './scheduled_absence_actions';

jest.mock('mattermost-redux/client', () => ({
    ...jest.requireActual('mattermost-redux/client'),
    Client4: {
        ...jest.requireActual('mattermost-redux/client').Client4,
        getTeamMembers: jest.fn(),
    },
}));

const PAGE_SIZE = 200;

function teamMember(id: string, numericUserId: number, scheduledAbsence: ScheduledAbsence | null): TeamMembership {
    return {id, user_id: numericUserId, scheduled_absence: scheduledAbsence} as unknown as TeamMembership;
}

describe('fetchTeamScheduledAbsences', () => {
    test('should dispatch the scheduled absences of the team members keyed by kChat user id', async () => {
        const absence = {start: 1000, end: 2000};
        (Client4.getTeamMembers as jest.Mock).mockResolvedValue([
            teamMember('user1-uuid', 2039675, absence),
            teamMember('user2-uuid', 1446932, null),
        ]);

        const store = await configureStore();
        await store.dispatch(fetchTeamScheduledAbsences('team_id'));

        expect(Client4.getTeamMembers).toHaveBeenCalledWith('team_id', 0, PAGE_SIZE, {status: '1'});
        expect(store.getState().entities.users.scheduledAbsences).toEqual({
            'user1-uuid': absence,
        });
    });

    test('should fetch all pages until the last one', async () => {
        (Client4.getTeamMembers as jest.Mock).mockImplementation((teamId: string, page: number) => {
            if (page === 0) {
                return Promise.resolve(Array.from({length: PAGE_SIZE}, (_, i) => teamMember(`user${i}-uuid`, i, null)));
            }
            return Promise.resolve([teamMember('last_user-uuid', 535752, {start: 3000, end: 4000})]);
        });

        const store = await configureStore();
        await store.dispatch(fetchTeamScheduledAbsences('team_id'));

        expect(Client4.getTeamMembers).toHaveBeenCalledTimes(2);
        expect(store.getState().entities.users.scheduledAbsences).toEqual({
            'last_user-uuid': {start: 3000, end: 4000},
        });
    });

    test('should not dispatch when the request fails', async () => {
        (Client4.getTeamMembers as jest.Mock).mockRejectedValue(new Error('network error'));

        const store = await configureStore();
        await store.dispatch(fetchTeamScheduledAbsences('team_id'));

        expect(store.getState().entities.users.scheduledAbsences).toEqual({});
    });
});
