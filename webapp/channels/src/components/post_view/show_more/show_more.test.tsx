// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import ShowMore from 'components/post_view/show_more/show_more';

describe('components/post_view/ShowMore', () => {
    const children = (<div><p>{'text'}</p></div>);
    const baseProps = {
        checkOverflow: 0,
        isAttachmentText: false,
        isRHSExpanded: false,
        isRHSOpen: false,
        maxHeight: 200,
        text: 'text',
        compactDisplay: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<ShowMore {...baseProps}>{children}</ShowMore>);
        expect(wrapper).toMatchSnapshot();
        wrapper.unmount();
    });

    test('should match snapshot, PostMessageView on collapsed view', () => {
        const wrapper = shallow(<ShowMore {...baseProps}/>);
        wrapper.setState({isOverflow: true, isCollapsed: true});
        expect(wrapper).toMatchSnapshot();
        wrapper.unmount();
    });

    test('should match snapshot, PostMessageView on expanded view', () => {
        const wrapper = shallow(<ShowMore {...baseProps}/>);
        wrapper.setState({isOverflow: true, isCollapsed: false});
        expect(wrapper).toMatchSnapshot();
        wrapper.unmount();
    });

    test('should match snapshot, PostAttachment on collapsed view', () => {
        const wrapper = shallow(
            <ShowMore
                {...baseProps}
                isAttachmentText={true}
            />,
        );
        wrapper.setState({isOverflow: true, isCollapsed: true});
        expect(wrapper).toMatchSnapshot();
        wrapper.unmount();
    });

    test('should match snapshot, PostAttachment on expanded view', () => {
        const wrapper = shallow(
            <ShowMore
                {...baseProps}
                isAttachmentText={true}
            />,
        );
        wrapper.setState({isOverflow: true, isCollapsed: false});
        expect(wrapper).toMatchSnapshot();
        wrapper.unmount();
    });

    test('should match snapshot, PostMessageView on expanded view with compactDisplay', () => {
        const wrapper = shallow(
            <ShowMore
                {...baseProps}
                compactDisplay={true}
            />,
        );
        wrapper.setState({isOverflow: true, isCollapsed: false});
        expect(wrapper).toMatchSnapshot();
        wrapper.unmount();
    });

    test('should call checkTextOverflow', () => {
        const wrapper = shallow(<ShowMore {...baseProps}/>);
        const instance = wrapper.instance() as ShowMore;
        instance.checkTextOverflow = jest.fn();

        expect(instance.checkTextOverflow).not.toBeCalled();

        wrapper.setProps({isRHSExpanded: true});
        expect(instance.checkTextOverflow).toBeCalledTimes(1);

        wrapper.setProps({isRHSExpanded: false});
        expect(instance.checkTextOverflow).toBeCalledTimes(2);

        wrapper.setProps({isRHSOpen: true});
        expect(instance.checkTextOverflow).toBeCalledTimes(3);

        wrapper.setProps({isRHSOpen: false});
        expect(instance.checkTextOverflow).toBeCalledTimes(4);

        wrapper.setProps({text: 'text change'});
        expect(instance.checkTextOverflow).toBeCalledTimes(5);

        wrapper.setProps({text: 'text another change'});
        expect(instance.checkTextOverflow).toBeCalledTimes(6);

        wrapper.setProps({checkOverflow: 1});
        expect(instance.checkTextOverflow).toBeCalledTimes(7);

        wrapper.setProps({checkOverflow: 1});
        expect(instance.checkTextOverflow).toBeCalledTimes(7);
        wrapper.unmount();
    });

    describe('overflow check scheduling', () => {
        let rafCallbacks: FrameRequestCallback[];
        let rafSpy: jest.SpyInstance;

        const setHidden = (hidden: boolean) => {
            Object.defineProperty(document, 'hidden', {
                configurable: true,
                value: hidden,
            });
        };

        const flushRaf = () => {
            while (rafCallbacks.length > 0) {
                const callbacks = rafCallbacks.splice(0);
                callbacks.forEach((callback) => callback(0));
            }
        };

        const mountWithOverflowingText = (hidden: boolean) => {
            let scrollHeightReads = 0;
            setHidden(hidden);
            const wrapper = shallow(<ShowMore {...baseProps}/>);
            const instance = wrapper.instance() as unknown as {
                textContainer: {current: {get scrollHeight(): number} | null};
            };
            instance.textContainer = {
                current: {
                    get scrollHeight() {
                        scrollHeightReads += 1;
                        return baseProps.maxHeight + 1;
                    },
                },
            };
            return {wrapper, getReads: () => scrollHeightReads};
        };

        beforeEach(() => {
            rafCallbacks = [];
            rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
                rafCallbacks.push(callback);
                return rafCallbacks.length;
            });
            setHidden(false);
        });

        afterEach(() => {
            setHidden(false);
            document.dispatchEvent(new Event('visibilitychange'));
            flushRaf();
            rafSpy.mockRestore();
        });

        test('measures once in a single frame when checked repeatedly while visible', () => {
            const {wrapper, getReads} = mountWithOverflowingText(false);

            wrapper.setProps({checkOverflow: 1});
            wrapper.setProps({checkOverflow: 2});
            wrapper.setProps({checkOverflow: 3});

            expect(rafSpy).toBeCalledTimes(1);

            flushRaf();
            expect(getReads()).toBe(1);
            expect(wrapper.state('isOverflow')).toBe(true);
            wrapper.unmount();
        });

        test('queues checks while hidden and applies them in one frame when visible again', () => {
            const {wrapper, getReads} = mountWithOverflowingText(true);

            wrapper.setProps({checkOverflow: 1});
            wrapper.setProps({checkOverflow: 2});
            wrapper.setProps({checkOverflow: 3});

            expect(rafSpy).not.toBeCalled();

            setHidden(false);
            document.dispatchEvent(new Event('visibilitychange'));
            expect(rafSpy).toBeCalledTimes(1);

            flushRaf();
            expect(getReads()).toBe(1);
            expect(wrapper.state('isOverflow')).toBe(true);
            wrapper.unmount();
        });

        test('does not measure a component unmounted while its check is queued', () => {
            const {wrapper, getReads} = mountWithOverflowingText(true);

            wrapper.setProps({checkOverflow: 1});
            wrapper.unmount();

            setHidden(false);
            document.dispatchEvent(new Event('visibilitychange'));
            flushRaf();

            expect(getReads()).toBe(0);
        });
    });
});
