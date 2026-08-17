import {useCallback} from 'react';
import {useDispatch} from 'react-redux';

import {translatePost} from 'mattermost-redux/actions/posts';

import type {DispatchFunc} from 'types/store';

export default function useTranslate() {
    const dispatch: DispatchFunc = useDispatch();

    return useCallback((postId: string, forceThread?: boolean) => {
        dispatch(translatePost(postId, forceThread));
    }, [dispatch]);
}
