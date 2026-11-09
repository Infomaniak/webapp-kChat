// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import StatusIcon from 'components/status_icon';
import Avatar from 'components/widgets/users/avatar';

type Props = {
    username?: string;
    hideStatus?: boolean;
    status?: string;
    isAbsent?: boolean;
    urlSrc: string;
}
const ProfilePopoverAvatar = ({
    username,
    hideStatus,
    status,
    isAbsent,
    urlSrc,
}: Props) => {
    return (
        <div className='user-popover-image'>
            <Avatar
                id='userAvatar'
                size='xxl'
                username={username || ''}
                url={urlSrc}
                tabIndex={-1}
            />
            <StatusIcon
                className='status user-popover-status'
                isAbsent={isAbsent}
                status={hideStatus ? undefined : status}
                button={true}
            />
        </div>
    );
};

export default ProfilePopoverAvatar;
