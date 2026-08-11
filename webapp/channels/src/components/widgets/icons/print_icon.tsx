// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

export default function PrintIcon(props: React.HTMLAttributes<HTMLSpanElement>) {
    const {formatMessage} = useIntl();
    return (
        <span {...props}>
            <svg
                width='18'
                height='18'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                role='img'
                aria-label={formatMessage({id: 'generic_icons.print', defaultMessage: 'Print Icon'})}
            >
                <polyline points='6 9 6 2 18 2 18 9'/>
                <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'/>
                <rect
                    x='6'
                    y='14'
                    width='12'
                    height='8'
                />
            </svg>
        </span>
    );
}
