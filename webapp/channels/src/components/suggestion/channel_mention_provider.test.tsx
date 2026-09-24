// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import type {Channel} from '@mattermost/types/channels';

import {getMyChannelMemberships, getMyChannels} from 'mattermost-redux/selectors/entities/channels';

import ChannelMentionProvider from 'components/suggestion/channel_mention_provider';

import {Constants} from 'utils/constants';
import {TestHelper} from 'utils/test_helper';

jest.mock('stores/redux_store', () => ({
    dispatch: jest.fn(),
    getState: jest.fn(),
}));

jest.mock('mattermost-redux/selectors/entities/channels', () => ({
    ...jest.requireActual('mattermost-redux/selectors/entities/channels'),
    getMyChannels: jest.fn(),
    getMyChannelMemberships: jest.fn(),
}));

describe('components/suggestion/channel_mention_provider', () => {
    const townSquare = TestHelper.getChannelMock({id: 'channelid1', name: 'town-square', display_name: 'Town Square', type: 'O', delete_at: 0});
    const publicX = TestHelper.getChannelMock({id: 'channelid2', name: 'public-x', display_name: 'Public X', type: 'O', delete_at: 0});

    const mockMyChannels = (channels: Channel[]) => {
        (getMyChannels as jest.Mock).mockReturnValue(channels);
        (getMyChannelMemberships as jest.Mock).mockReturnValue(Object.fromEntries(channels.map((c) => [c.id, {user_id: 'userid1', channel_id: c.id}])));
    };

    const searchSuccess = (channels: Channel[]) => jest.fn().mockImplementation((_term: string, success: (c: Channel[]) => void) => {
        success(channels);
        return Promise.resolve({data: channels});
    });

    const searchError = () => {
        const result = Promise.reject(new Error('failed'));
        result.catch(() => {});
        return jest.fn().mockImplementation((_term: string, _success: (c: Channel[]) => void, error: () => void) => {
            error();
            return result;
        });
    };

    it('should return false for pretexts that are not channel mentions', () => {
        mockMyChannels([townSquare]);

        const provider = new ChannelMentionProvider(jest.fn(), false);
        const resultCallback = jest.fn();
        expect(provider.handlePretextChanged('', resultCallback)).toEqual(false);
        expect(provider.handlePretextChanged('this is a sentence', resultCallback)).toEqual(false);
        expect(provider.handlePretextChanged('~~strike~~', resultCallback)).toEqual(false);
        expect(resultCallback).not.toHaveBeenCalled();
    });

    it('should include a loading item while searching when local channels match', () => {
        mockMyChannels([townSquare]);

        const autocompleteChannels = searchSuccess([]);
        const provider = new ChannelMentionProvider(autocompleteChannels, false);
        const resultCallback = jest.fn();
        expect(provider.handlePretextChanged('~town', resultCallback)).toEqual(true);

        expect(autocompleteChannels).toHaveBeenCalledWith('town', expect.any(Function), expect.any(Function));
        expect(resultCallback).toHaveBeenCalledTimes(2);
        expect(resultCallback).toHaveBeenNthCalledWith(1, {
            matchedPretext: '~town',
            terms: ['~town-square', ' '],
            items: [
                {type: Constants.MENTION_CHANNELS, channel: townSquare},
                {type: Constants.MENTION_MORE_CHANNELS, loading: true},
            ],
            component: expect.anything(),
        });
        expect(resultCallback).toHaveBeenNthCalledWith(2, {
            matchedPretext: '~town',
            terms: ['~town-square'],
            items: [{type: Constants.MENTION_CHANNELS, channel: townSquare}],
            component: expect.anything(),
        });
    });

    it('should not emit a loading item when no local channel matches [RM-624341]', () => {
        mockMyChannels([townSquare]);

        const autocompleteChannels = searchSuccess([]);
        const provider = new ChannelMentionProvider(autocompleteChannels, false);
        const resultCallback = jest.fn();
        expect(provider.handlePretextChanged('~x', resultCallback)).toEqual(true);

        expect(autocompleteChannels).toHaveBeenCalledWith('x', expect.any(Function), expect.any(Function));
        expect(resultCallback).toHaveBeenCalledTimes(2);
        expect(resultCallback).toHaveBeenNthCalledWith(1, {matchedPretext: '~x', terms: [], items: [], component: expect.anything()});
        expect(resultCallback).toHaveBeenNthCalledWith(2, {matchedPretext: '~x', terms: [], items: [], component: expect.anything()});

        resultCallback.mockClear();
        provider.handlePretextChanged('~x de base', resultCallback);
        expect(resultCallback).toHaveBeenNthCalledWith(1, {matchedPretext: '~x de base', terms: [], items: [], component: expect.anything()});
        expect(resultCallback).toHaveBeenNthCalledWith(2, {matchedPretext: '~x de base', terms: [], items: [], component: expect.anything()});
    });

    it('should emit server results without a loading item when only the server matches', () => {
        mockMyChannels([townSquare]);

        let successCallback: (channels: Channel[]) => void = jest.fn();
        const autocompleteChannels = jest.fn().mockImplementation((_term: string, success: (c: Channel[]) => void) => {
            successCallback = success;
            return Promise.resolve({data: []});
        });
        const provider = new ChannelMentionProvider(autocompleteChannels, false);
        const resultCallback = jest.fn();
        expect(provider.handlePretextChanged('~pub', resultCallback)).toEqual(true);
        expect(resultCallback).toHaveBeenNthCalledWith(1, {matchedPretext: '~pub', terms: [], items: [], component: expect.anything()});

        successCallback([publicX]);
        expect(resultCallback).toHaveBeenNthCalledWith(2, {
            matchedPretext: '~pub',
            terms: ['~public-x'],
            items: [{type: Constants.MENTION_MORE_CHANNELS, channel: publicX}],
            component: expect.anything(),
        });
    });

    it('should not emit a loading item when the search fails', () => {
        mockMyChannels([townSquare]);

        const autocompleteChannels = searchError();
        const provider = new ChannelMentionProvider(autocompleteChannels, false);
        const resultCallback = jest.fn();
        expect(provider.handlePretextChanged('~x', resultCallback)).toEqual(true);
        expect(resultCallback).toHaveBeenNthCalledWith(1, {matchedPretext: '~x', terms: [], items: [], component: expect.anything()});
        expect(resultCallback).toHaveBeenNthCalledWith(2, {matchedPretext: '~x', terms: [], items: [], component: expect.anything()});
    });
});
