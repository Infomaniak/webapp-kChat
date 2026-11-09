// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import React from 'react';

import StatusAbsenceIcon from 'components/widgets/icons/status_absence_icon';
import StatusDndAbsenceIcon from 'components/widgets/icons/status_dnd_absence_icon';
import StatusOnlineAbsenceIcon from 'components/widgets/icons/status_online_absence_icon';

type Props = {
    className?: string;
    isAbsent?: boolean;
    status?: string;
}

const statusToIconMap: { [key: string]: string } = {
    online: 'icon-check-circle',
    away: 'icon-clock',
    dnd: 'icon-minus-circle',
    default: 'icon-circle-outline',
};

const StatusIconNew = ({className = '', isAbsent = false, status = ''}: Props) => {
    if (!status) {
        return null;
    }

    if (status === 'absence' || (isAbsent && (status === 'away' || status === 'offline'))) {
        return <StatusAbsenceIcon className={className}/>;
    }

    if (isAbsent && status === 'online') {
        return <StatusOnlineAbsenceIcon className={className}/>;
    }

    if (isAbsent && status === 'dnd') {
        return <StatusDndAbsenceIcon className={className}/>;
    }

    const iconName = statusToIconMap[status] || statusToIconMap.default;

    return <i className={`${iconName} ${className}`}/>;
};

export default React.memo(StatusIconNew);
