// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {FormattedMessage} from 'react-intl';
import {useSelector} from 'react-redux';

import {getPost, makeGetThreadReplyCount} from 'mattermost-redux/selectors/entities/posts';

import type {GlobalState} from 'types/store';

type Props = {
    postId: string;
};

const RootPostDivider: React.FC<Props> = ({postId}) => {
    const post = useSelector((state: GlobalState) => getPost(state, postId));
    const getThreadReplyCount = useMemo(makeGetThreadReplyCount, []);

    const totalReplies = useSelector((state: GlobalState) => getThreadReplyCount(state, post));

    if (totalReplies === 0) {
        return null; // Return null if there are no replies
    }

    return (
        <div className='root-post__divider'>
            <div>
                <FormattedMessage
                    id='threading.numReplies'
                    defaultMessage='{totalReplies, plural, =0 {Reply} =1 {# reply} other {# replies}}'
                    values={{totalReplies}}
                />
            </div>
        </div>
    );
};

export default RootPostDivider;
