// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import React, {memo} from 'react';

import StatusAbsenceAvatarIcon from 'components/widgets/icons/status_absence_avatar_icon';
import StatusAbsenceIcon from 'components/widgets/icons/status_absence_icon';
import StatusAwayAvatarIcon from 'components/widgets/icons/status_away_avatar_icon';
import StatusAwayIcon from 'components/widgets/icons/status_away_icon';
import StatusDndAbsenceIcon from 'components/widgets/icons/status_dnd_absence_icon';
import StatusDndAvatarIcon from 'components/widgets/icons/status_dnd_avatar_icon';
import StatusDndIcon from 'components/widgets/icons/status_dnd_icon';
import StatusOfflineAvatarIcon from 'components/widgets/icons/status_offline_avatar_icon';
import StatusOfflineIcon from 'components/widgets/icons/status_offline_icon';
import StatusOnlineAbsenceIcon from 'components/widgets/icons/status_online_absence_icon';
import StatusOnlineAvatarIcon from 'components/widgets/icons/status_online_avatar_icon';
import StatusOnlineIcon from 'components/widgets/icons/status_online_icon';

type Props = {
    button?: boolean;
    isAbsent?: boolean;
    status?: string;
    className?: string;
    type?: string;
}

const StatusIcon = ({
    className = '',
    button = false,
    isAbsent = false,
    status,
    type,
}: Props) => {
    if (!status) {
        return null;
    }

    let iconClassName = `status ${className}`;

    if (button) {
        iconClassName = className || '';
    }

    if (type === 'avatar') {
        if (isAbsent && (status === 'away' || status === 'offline')) {
            return <StatusAbsenceAvatarIcon className={iconClassName}/>;
        }
        if (status === 'online') {
            if (isAbsent) {
                return <StatusOnlineAbsenceIcon className={iconClassName}/>;
            }
            return <StatusOnlineAvatarIcon className={iconClassName}/>;
        } else if (status === 'away') {
            return <StatusAwayAvatarIcon className={iconClassName}/>;
        } else if (status === 'dnd') {
            if (isAbsent) {
                return <StatusDndAbsenceIcon className={iconClassName}/>;
            }
            return <StatusDndAvatarIcon className={iconClassName}/>;
        } else if (status === 'absence') {
            return <StatusAbsenceAvatarIcon className={iconClassName}/>;
        }
        if (isAbsent) {
            return <StatusAbsenceAvatarIcon className={iconClassName}/>;
        }
        return <StatusOfflineAvatarIcon className={iconClassName}/>;
    }

    if (isAbsent && (status === 'away' || status === 'offline')) {
        return <StatusAbsenceIcon className={iconClassName}/>;
    }
    if (status === 'online') {
        if (isAbsent) {
            return <StatusOnlineAbsenceIcon className={iconClassName}/>;
        }
        return <StatusOnlineIcon className={iconClassName}/>;
    } else if (status === 'away') {
        return <StatusAwayIcon className={iconClassName}/>;
    } else if (status === 'dnd') {
        if (isAbsent) {
            return <StatusDndAbsenceIcon className={iconClassName}/>;
        }
        return <StatusDndIcon className={iconClassName}/>;
    } else if (status === 'absence') {
        return <StatusAbsenceIcon className={iconClassName}/>;
    }
    if (isAbsent) {
        return <StatusAbsenceIcon className={iconClassName}/>;
    }
    return <StatusOfflineIcon className={iconClassName}/>;
};

export default memo(StatusIcon);
