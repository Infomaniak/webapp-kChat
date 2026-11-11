// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ClientError} from '@mattermost/client';
import type {ServerError} from '@mattermost/types/errors';

import {UserTypes} from 'mattermost-redux/action_types';
import {forceLogoutIfNecessary, redirectToErrorPageIfNecessary} from 'mattermost-redux/actions/helpers';
import {Client4} from 'mattermost-redux/client';

import configureStore, {mockDispatch} from '../../test/test_store';

jest.mock('utils/browser_history', () => ({
    getHistory: () => ({
        replace: mockReplace,
        push: mockPush,
    }),
}));

const mockReplace = jest.fn((path: string | {pathname?: string}) => {
    const target = typeof path === 'string' ? path : path.pathname ?? '/';
    window.history.replaceState({}, '', target);
});
const mockPush = jest.fn();

describe('Actions.Helpers', () => {
    beforeEach(() => {
        window.history.replaceState({}, '', '/');
    });

    describe('forceLogoutIfNecessary', () => {
        const token = 'token';

        beforeEach(() => {
            Client4.setToken(token);
        });

        it('should do nothing when passed a client error', async () => {
            const store = configureStore({
                entities: {
                    users: {
                        currentUserId: 'user',
                    },
                },
            });
            const dispatch = mockDispatch(store.dispatch);

            const error = new ClientError(Client4.getUrl(), {
                message: 'no internet connection',
                url: '/api/v4/foo/bar',
            });

            forceLogoutIfNecessary(error, dispatch as any, store.getState);

            expect(Client4.token).toEqual(token);
            expect(dispatch.actions).toEqual([]);
        });

        it('should do nothing when passed a non-401 server error', async () => {
            const store = configureStore({
                entities: {
                    users: {
                        currentUserId: 'user',
                    },
                },
            });
            const dispatch = mockDispatch(store.dispatch);

            const error = new ClientError(Client4.getUrl(), {
                message: 'Failed to do something',
                status_code: 403,
                url: '/api/v4/foo/bar',
            });

            forceLogoutIfNecessary(error, dispatch as any, store.getState);

            expect(Client4.token).toEqual(token);
            expect(dispatch.actions).toEqual([]);
        });

        it('should trigger logout when passed a 401 server error', async () => {
            const store = configureStore({
                entities: {
                    users: {
                        currentUserId: 'user',
                    },
                },
            });
            const dispatch = mockDispatch(store.dispatch);

            const error = new ClientError(Client4.getUrl(), {
                message: 'Failed to do something',
                status_code: 401,
                url: '/api/v4/foo/bar',
            });

            forceLogoutIfNecessary(error, dispatch as any, store.getState);

            expect(Client4.token).not.toEqual(token);
            expect(dispatch.actions).toEqual([{type: UserTypes.LOGOUT_SUCCESS, data: {}}]);
        });

        it('should do nothing when failing to log in', async () => {
            const store = configureStore({
                entities: {
                    users: {
                        currentUserId: 'user',
                    },
                },
            });
            const dispatch = mockDispatch(store.dispatch);

            const error = new ClientError(Client4.getUrl(), {
                message: 'Failed to do something',
                status_code: 401,
                url: '/api/v4/login',
            });

            forceLogoutIfNecessary(error, dispatch as any, store.getState);

            expect(Client4.token).toEqual(token);
            expect(dispatch.actions).toEqual([]);
        });

        it('should redirect to the maintenance error page once and not log out on 503 errors', async () => {
            const store = configureStore({
                entities: {
                    users: {
                        currentUserId: 'user',
                    },
                },
            });
            const dispatch = mockDispatch(store.dispatch);

            const error = new ClientError(Client4.getUrl(), {
                message: 'Maintenance mode',
                status_code: 503,
                url: '/api/v4/foo/bar',
            });

            forceLogoutIfNecessary(error, dispatch as any, store.getState);
            forceLogoutIfNecessary(error, dispatch as any, store.getState);

            expect(mockReplace).toHaveBeenCalledTimes(1);
            expect(mockReplace).toHaveBeenCalledWith('/error?type=maintenance');
            expect((document as any).location.pathname).toEqual('/error');
            expect(Client4.token).toEqual(token);
            expect(dispatch.actions).toEqual([]);
        });

        it('should do nothing when not logged in', async () => {
            const store = configureStore({
                entities: {
                    users: {
                        currentUserId: '',
                    },
                },
            });
            const dispatch = mockDispatch(store.dispatch);

            const error = new ClientError(Client4.getUrl(), {
                message: 'Failed to do something',
                status_code: 401,
                url: '/api/v4/foo/bar',
            });

            forceLogoutIfNecessary(error, dispatch as any, store.getState);

            expect(Client4.token).toEqual(token);
            expect(dispatch.actions).toEqual([]);
        });
    });

    describe('redirectToErrorPageIfNecessary', () => {
        it('should not redirect again to maintenance when already on the maintenance error page', () => {
            window.history.replaceState({}, '', '/error?type=maintenance');

            redirectToErrorPageIfNecessary({message: 'Maintenance mode', status_code: 503});

            expect(mockReplace).not.toHaveBeenCalled();
        });

        it('should let force migration and product locked take over from the maintenance error page', () => {
            window.history.replaceState({}, '', '/error?type=maintenance');

            redirectToErrorPageIfNecessary({message: 'Force migration', status_code: 1});
            redirectToErrorPageIfNecessary({message: 'Product locked', status_code: 401, server_error_id: 'product_locked'});

            expect(mockReplace).toHaveBeenLastCalledWith('/error?type=blocked');
        });

        it('should redirect to maintenance from another error page type', () => {
            window.history.replaceState({}, '', '/error?type=channel_not_found');

            redirectToErrorPageIfNecessary({message: 'Maintenance mode', status_code: 503});

            expect(mockReplace).toHaveBeenCalledTimes(1);
            expect(mockReplace).toHaveBeenCalledWith('/error?type=maintenance');
        });

        it('should redirect once to the maintenance page when receiving multiple 503 errors', () => {
            const maintenanceError: ServerError = {message: 'Maintenance mode', status_code: 503};

            redirectToErrorPageIfNecessary(maintenanceError);
            redirectToErrorPageIfNecessary(maintenanceError);

            expect(mockReplace).toHaveBeenCalledTimes(1);
            expect(mockReplace).toHaveBeenCalledWith('/error?type=maintenance');
            expect((document as any).location.pathname).toEqual('/error');
        });

        it('should not treat subpath error routes as the error page', () => {
            (window as any).basename = '/subpath';
            window.history.replaceState({}, '', '/subpath/errors/channels/team-slug');

            redirectToErrorPageIfNecessary({message: 'Maintenance mode', status_code: 503});

            expect(mockReplace).toHaveBeenCalledTimes(1);
            expect(mockReplace).toHaveBeenCalledWith('/error?type=maintenance');
        });

        it('should detect the error page on subpath deployments', () => {
            (window as any).basename = '/subpath';
            window.history.replaceState({}, '', '/subpath/error?type=maintenance');

            redirectToErrorPageIfNecessary({message: 'Maintenance mode', status_code: 503});

            expect(mockReplace).not.toHaveBeenCalled();
        });

        afterEach(() => {
            (window as any).basename = undefined;
        });
    });
});
