// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import type {ScheduledAbsence} from '@mattermost/types/users';

import {UserTypes} from 'mattermost-redux/action_types';
import {logError} from 'mattermost-redux/actions/errors';
import {Client4} from 'mattermost-redux/client';

import type {ActionFuncAsync} from 'types/store';

const SCHEDULED_ABSENCE_FETCH_PAGE_SIZE = 200;

export function fetchTeamScheduledAbsences(teamId: string): ActionFuncAsync<boolean> {
    return async (dispatch) => {
        const data: Record<string, ScheduledAbsence | null> = {};

        try {
            for (let page = 0; ; page++) {
                // eslint-disable-next-line no-await-in-loop
                const members = await Client4.getTeamMembers(teamId, page, SCHEDULED_ABSENCE_FETCH_PAGE_SIZE, {status: '1'});
                for (const member of members) {
                    data[member.id ?? member.user_id] = member.scheduled_absence ?? null;
                }
                if (members.length < SCHEDULED_ABSENCE_FETCH_PAGE_SIZE) {
                    break;
                }
            }
        } catch (error) {
            dispatch(logError(error));
            return {data: false};
        }

        dispatch({type: UserTypes.RECEIVED_SCHEDULED_ABSENCES, data});
        return {data: true};
    };
}
