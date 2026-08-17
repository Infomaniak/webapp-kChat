import {FormatLetterCaseIcon} from '@infomaniak/compass-icons/components';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import {useSelector} from 'react-redux';
import styled from 'styled-components';

import type {Post} from '@mattermost/types/posts';

import {getConfig} from 'mattermost-redux/selectors/entities/general';
import {getUser} from 'mattermost-redux/selectors/entities/users';

import type {GlobalState} from 'types/store';

import IconEuria from './assets/icon_euria';
import IconThreadSummarization from './assets/icon_thread_summarization';
import DotMenu, {DropdownMenu, DropdownMenuItem} from './dot_menu';

import useSummarize from '../hooks/use_summarize';
import useTranslate from '../hooks/use_translate';

type Props = {
    post: Post;
    location: string;
}

const PostMenu = (props: Props) => {
    const post = props.post;

    const user = useSelector((state: GlobalState) => getUser(state, post.user_id));
    const isBot = Boolean(user && user.is_bot);
    const postTranslationEnabled = useSelector((state: GlobalState) => getConfig(state).FeatureFlagTranslation === 'true');

    const summarize = useSummarize();
    const translate = useTranslate();

    if (isBot || props.location === 'RHS_COMMENT') {
        return null;
    }

    return (
        <DotMenu
            icon={<IconEuria/>}
            dropdownMenu={StyledDropdownMenu}
        >
            <DropdownMenuItem onClick={() => summarize(post.id)}>
                <span className='icon'><IconThreadSummarization/></span>
                <div className=''>
                    <FormattedMessage
                        id='ai.summarizeThread'
                        defaultMessage='Summarize'
                    />
                </div>
            </DropdownMenuItem>
            {postTranslationEnabled &&
                <DropdownMenuItem onClick={() => translate(post.id, props.location === 'RHS_ROOT')}>
                    <span className='icon'><FormatLetterCaseIcon size={18}/></span>
                    <div className=''>
                        <FormattedMessage
                            id='post_info.translate'
                            defaultMessage='Translate'
                        />
                    </div>
                </DropdownMenuItem>
            }
        </DotMenu>
    );
};

const StyledDropdownMenu = styled(DropdownMenu)`
	min-width: 240px;
`;

export default PostMenu;
