// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import type {CSSProperties} from 'react';
import React from 'react';
import {useIntl} from 'react-intl';

export default function StatusOnlineAbsenceIcon(props: React.HTMLAttributes<HTMLSpanElement>) {
    const {formatMessage} = useIntl();
    return (
        <span {...props}>
            <svg
                x='0px'
                y='0px'
                width='100%'
                height='100%'
                viewBox='0 0 16 16'
                style={style}
                role='img'
                aria-label={formatMessage({id: 'mobile.set_status.absence.icon', defaultMessage: 'Scheduled Absence Icon'})}
            >
                <path
                    className='online-absence--icon'
                    d='M7.508.014a8 8 0 0 0-5.506 2.692 7.99 7.99 0 0 0-1.887 6.66 7.96 7.96 0 0 0 2.312 4.373 7.93 7.93 0 0 0 4.57 2.201c1.015.13 2.202.046 3.137-.222a7.97 7.97 0 0 0 3.596-2.134 7.95 7.95 0 0 0 1.97-3.394 8.2 8.2 0 0 0 .11-3.948 8.02 8.02 0 0 0-2.514-4.24C11.698.591 9.665-.108 7.508.014m.043 1.062a7 7 0 0 0-3.12.976c-.695.407-1.452 1.09-1.97 1.776a6.94 6.94 0 0 0-.898 6.75c.368.917.872 1.67 1.588 2.372a6.3 6.3 0 0 0 1.722 1.237c.78.391 1.49.604 2.372.71a9 9 0 0 0 1.512 0 6.8 6.8 0 0 0 2.372-.71 6.3 6.3 0 0 0 1.722-1.237 6.5 6.5 0 0 0 1.335-1.82c.336-.67.545-1.303.656-1.991.06-.378.077-.556.089-.976a6.9 6.9 0 0 0-.926-3.638 7.2 7.2 0 0 0-1.833-2.066 6.95 6.95 0 0 0-3.39-1.351 12 12 0 0 0-1.231-.032m4.243 2.993a.6.6 0 0 0-.173.122c-.054.053-1.255 1.561-2.668 3.352a445 445 0 0 1-2.62 3.302c-.073.069-.165.065-.23-.009-.026-.03-.412-.571-.856-1.202a45 45 0 0 0-.863-1.202.53.53 0 0 0-.623-.083.52.52 0 0 0-.27.472c0 .112.006.143.05.223.027.051.42.62.873 1.263.881 1.251.968 1.36 1.19 1.49.061.036.172.085.247.11.12.04.162.045.374.046.216 0 .25-.004.372-.047.197-.069.394-.191.514-.32.141-.151 5.336-6.748 5.367-6.814a.55.55 0 0 0-.012-.429.6.6 0 0 0-.295-.275.7.7 0 0 0-.377.001'
                />
            </svg>
        </span>
    );
}

const style: CSSProperties = {
    fillRule: 'evenodd',
    clipRule: 'evenodd',
    strokeLinejoin: 'round',
    strokeMiterlimit: 1.41421,
};
