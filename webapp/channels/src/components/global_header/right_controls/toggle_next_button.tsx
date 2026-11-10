// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.

import IconButton from '@infomaniak/compass-components/components/icon-button';
import React from 'react';
import {FormattedMessage, useIntl} from 'react-intl';
import {useDispatch, useSelector} from 'react-redux';

import {getCurrentTeam} from 'mattermost-redux/selectors/entities/teams';

import {openModal} from 'actions/views/modals';

import ToggleNextModal from 'components/toggle_next_modal';
import WithTooltip from 'components/with_tooltip';

import {ModalIdentifiers} from 'utils/constants';
import {isStaff} from 'utils/team_utils';

import type {GlobalState} from 'types/store';

const ToggleNextButton = (): JSX.Element | null => {
    const {formatMessage} = useIntl();
    const dispatch = useDispatch();
    const currentTeam = useSelector((state: GlobalState) => getCurrentTeam(state));

    if (!isStaff(currentTeam)) {
        return null;
    }

    const isNext = document.cookie.indexOf('KCHAT_NEXT=always') !== -1;

    const handleClick = () => {
        dispatch(openModal({
            modalId: ModalIdentifiers.TOGGLE_NEXT,
            dialogType: ToggleNextModal,
        }));
    };

    return (
        <WithTooltip
            title={
                <FormattedMessage
                    id='toggle_next_modal.title'
                    defaultMessage='Switch to {version} version'
                    values={{version: isNext ? 'STABLE' : 'NEXT'}}
                />
            }
        >
            <IconButton
                className='grey'
                size={'sm'}
                icon={'laptop'}
                inverted={true}
                compact={true}
                onClick={handleClick}
                aria-label={formatMessage({
                    id: 'toggle_next_modal.title',
                    defaultMessage: 'Switch to {version} version',
                }, {version: isNext ? 'STABLE' : 'NEXT'})}
            />
        </WithTooltip>
    );
};

export default ToggleNextButton;
