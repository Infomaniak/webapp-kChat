// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GeneralTypes, UserTypes, ChannelTypes} from 'mattermost-redux/action_types';

import channelReducer from 'reducers/views/channel';

import {ActionTypes, Constants} from 'utils/constants';

describe('Reducers.channel', () => {
    const initialState = {
        postVisibility: {},
        lastChannelViewTime: {},
        loadingPosts: {},
        focusedPostId: '',
        permalinkLoadFailed: false,
        mobileView: false,
        lastUnreadChannel: null,
        lastGetPosts: {},
        toastStatus: false,
        channelPrefetchStatus: {},
    };

    test('Initial state', () => {
        const nextState = channelReducer(
            {},
            {},
        );

        expect(nextState).toEqual(initialState);
    });

    describe('channelPrefetchStatus', () => {
        test('should change status on dispatch of PREFETCH_POSTS_FOR_CHANNEL', () => {
            const nextState = channelReducer(
                initialState,
                {
                    type: ActionTypes.PREFETCH_POSTS_FOR_CHANNEL,
                    channelId: 'channelId',
                    status: 'success',
                },
            );

            expect(nextState).toEqual({
                ...initialState,
                channelPrefetchStatus: {
                    channelId: 'success',
                },
            });
        });

        test('should change clear channelPrefetchStatus on dispatch of WEBSOCKET_FAILURE', () => {
            const modifiedState = {
                ...initialState,
                channelPrefetchStatus: {
                    channelId: 'success',
                },
            };

            const nextState = channelReducer(
                modifiedState,
                {
                    type: GeneralTypes.WEBSOCKET_FAILURE,
                },
            );

            expect(nextState).toEqual(initialState);
        });

        test('should change clear channelPrefetchStatus on dispatch of WEBSOCKET_CLOSED', () => {
            const modifiedState = {
                ...initialState,
                channelPrefetchStatus: {
                    channelId: 'success',
                },
            };

            const nextState = channelReducer(
                modifiedState,
                {
                    type: GeneralTypes.WEBSOCKET_CLOSED,
                },
            );

            expect(nextState).toEqual(initialState);
        });

        test('should change clear channelPrefetchStatus on dispatch of LOGOUT_SUCCESS', () => {
            const modifiedState = {
                ...initialState,
                channelPrefetchStatus: {
                    channelId: 'success',
                },
            };

            const nextState = channelReducer(
                modifiedState,
                {
                    type: UserTypes.LOGOUT_SUCCESS,
                },
            );

            expect(nextState).toEqual(initialState);
        });

        test('should clear lastUnreadChannel on dispatch of LEAVE_CHANNEL', () => {
            const modifiedState = {
                ...initialState,
                lastUnreadChannel: {
                    channelId: '1',
                    hadMentions: true,
                },
            };

            const nextState = channelReducer(
                modifiedState,
                {
                    type: ChannelTypes.LEAVE_CHANNEL,
                    data: {id: '1'},
                },
            );

            expect(nextState).toEqual(initialState);
        });

        test('should not clear lastUnreadChannel on dispatch of LEAVE_CHANNEL on another channel', () => {
            const modifiedState = {
                ...initialState,
                lastUnreadChannel: {
                    channelId: '1',
                    hadMentions: true,
                },
            };

            const nextState = channelReducer(
                modifiedState,
                {
                    type: ChannelTypes.LEAVE_CHANNEL,
                    data: {id: '2'},
                },
            );

            expect(nextState).toEqual(modifiedState);
        });
    });

    describe('permalinkLoadFailed', () => {
        test('should set the flag on dispatch of PERMALINK_LOAD_FAILED', () => {
            const nextState = channelReducer(
                initialState,
                {
                    type: ActionTypes.PERMALINK_LOAD_FAILED,
                },
            );

            expect(nextState).toEqual({
                ...initialState,
                permalinkLoadFailed: true,
            });
        });

        test('should clear the flag on dispatch of RECEIVED_FOCUSED_POST', () => {
            const modifiedState = {
                ...initialState,
                permalinkLoadFailed: true,
            };

            const nextState = channelReducer(
                modifiedState,
                {
                    type: ActionTypes.RECEIVED_FOCUSED_POST,
                    data: 'postId',
                    channelId: 'channelId',
                },
            );

            expect(nextState).toEqual({
                ...initialState,
                focusedPostId: 'postId',
                postVisibility: {channelId: Constants.POST_CHUNK_SIZE / 2},
            });
        });

        test('should clear the flag on dispatch of SELECT_CHANNEL', () => {
            const modifiedState = {
                ...initialState,
                permalinkLoadFailed: true,
            };

            const nextState = channelReducer(
                modifiedState,
                {
                    type: ChannelTypes.SELECT_CHANNEL,
                    data: 'channelId',
                },
            );

            expect(nextState).toEqual({
                ...initialState,
                postVisibility: {channelId: Constants.POST_CHUNK_SIZE / 2},
            });
        });

        test('should clear the flag on dispatch of LOGOUT_SUCCESS', () => {
            const modifiedState = {
                ...initialState,
                permalinkLoadFailed: true,
            };

            const nextState = channelReducer(
                modifiedState,
                {
                    type: UserTypes.LOGOUT_SUCCESS,
                },
            );

            expect(nextState).toEqual(initialState);
        });
    });
});
