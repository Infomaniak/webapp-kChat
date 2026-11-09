import {connect} from 'react-redux';

import {getStatusForUserId} from 'mattermost-redux/selectors/entities/users';

import {hasCurrentAbsenceForUserId} from 'selectors/views/scheduled_absence';

import type {GlobalState} from 'types/store';

import {AtMentionSuggestion} from './at_mention_suggestion';

type OwnProps = {
    item: {
        user_id?: string;
        id?: string;
    };
}

function mapStateToProps(state: GlobalState, ownProps: OwnProps) {
    const userId = ownProps.item?.user_id && ownProps.item?.id ? ownProps.item.id : undefined;

    return {
        status: userId ? getStatusForUserId(state, userId) : undefined,
        isAbsent: userId ? hasCurrentAbsenceForUserId(state, userId) : undefined,
    };
}

export default connect(mapStateToProps, null, null, {forwardRef: true})(AtMentionSuggestion);

