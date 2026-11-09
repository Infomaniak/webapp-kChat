// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import React from 'react';
import {FormattedMessage} from 'react-intl';
import {useSelector} from 'react-redux';

import {getDirectChannel} from 'mattermost-redux/selectors/entities/channels';

import {getScheduledAbsenceForUserId} from 'selectors/views/scheduled_absence';

import Timestamp from 'components/timestamp';
import StatusAbsenceIndicatorIcon from 'components/widgets/icons/status_absence_indicator_icon';

import type {GlobalState} from 'types/store';

import './absence_indicator.scss';

const DATE_FORMAT = {day: 'numeric', month: 'long'} as const;

type Props = {
    channelId: string;
    displayName: string;
}

export default function AbsenceIndicator({channelId, displayName}: Props) {
    const teammateId = useSelector((state: GlobalState) => getDirectChannel(state, channelId)?.teammate_id || '');
    const absence = useSelector((state: GlobalState) => (teammateId ? getScheduledAbsenceForUserId(state, teammateId) : undefined));
    const [now, setNow] = React.useState(() => Date.now());

    React.useEffect(() => {
        if (!absence || absence.end <= now) {
            return undefined;
        }

        const nextBoundary = absence.start > now ? absence.start : absence.end;
        const delay = Math.max(nextBoundary - now, 0);
        const timer = window.setTimeout(() => setNow(Date.now()), delay);

        return () => window.clearTimeout(timer);
    }, [absence, now]);

    if (!absence || absence.end <= now) {
        return null;
    }

    const isOngoing = absence.start <= now;

    const values = {
        name: (
            <span className='userDisplayName'>
                {displayName}
            </span>
        ),
        startDate: (
            <Timestamp
                value={absence.start}
                useRelative={false}
                useDate={DATE_FORMAT}
                useTime={false}
            />
        ),
        endDate: (
            <Timestamp
                value={absence.end}
                useRelative={false}
                useDate={DATE_FORMAT}
                useTime={false}
            />
        ),
    };

    return (
        <div
            className='AbsenceIndicator'
            data-testid='absenceIndicator'
        >
            <StatusAbsenceIndicatorIcon className='icon'/>
            <span className='text'>
                {isOngoing ? (
                    <>
                        <span className='prefix'>
                            <FormattedMessage
                                id='scheduled_absence.indicator.ongoing.prefix'
                                defaultMessage='{name}: currently out of office'
                                values={values}
                            />
                        </span>
                        <FormattedMessage
                            id='scheduled_absence.indicator.ongoing.dates'
                            defaultMessage=', from {startDate} to {endDate}.'
                            values={values}
                        />
                    </>
                ) : (
                    <>
                        <span className='prefix'>
                            <FormattedMessage
                                id='scheduled_absence.indicator.upcoming.prefix'
                                defaultMessage='{name}: scheduled absence'
                                values={values}
                            />
                        </span>
                        <FormattedMessage
                            id='scheduled_absence.indicator.upcoming.dates'
                            defaultMessage=', from {startDate} to {endDate}.'
                            values={values}
                        />
                    </>
                )}
            </span>
        </div>
    );
}
