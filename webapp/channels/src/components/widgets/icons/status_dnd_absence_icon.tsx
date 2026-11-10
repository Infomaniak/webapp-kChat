// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import React from 'react';
import {useIntl} from 'react-intl';

export default function StatusDndAbsenceIcon(props: React.HTMLAttributes<HTMLSpanElement>) {
    const {formatMessage} = useIntl();
    return (
        <span {...props}>
            <svg
                x='0px'
                y='0px'
                width='100%'
                height='100%'
                viewBox='0 0 16 16'
                role='img'
                aria-label={formatMessage({id: 'mobile.set_status.absence.icon', defaultMessage: 'Scheduled Absence Icon'})}
            >
                <path
                    className='dnd-absence--icon'
                    d='M8.001 0a8.002 8.002 0 0 1 5.657 13.657A8.001 8.001 0 0 1 2.344 2.343 8 8 0 0 1 8 0m0 1A7 7 0 0 0 1 8a7.001 7.001 0 1 0 7.001-7m3.5 6.501a.5.5 0 0 1 0 1H4.5a.5.5 0 0 1 0-1z'
                />
            </svg>
        </span>
    );
}
