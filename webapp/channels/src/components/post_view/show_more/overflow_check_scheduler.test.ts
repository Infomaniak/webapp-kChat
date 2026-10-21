// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    cancelOverflowCheck,
    scheduleOverflowCheck,
} from './overflow_check_scheduler';

describe('components/post_view/show_more/overflow_check_scheduler', () => {
    let rafCallbacks: FrameRequestCallback[];
    let rafSpy: jest.SpyInstance;

    const setHidden = (hidden: boolean) => {
        Object.defineProperty(document, 'hidden', {
            configurable: true,
            value: hidden,
        });
    };

    const flushFrames = () => {
        while (rafCallbacks.length > 0) {
            const callbacks = rafCallbacks.splice(0);
            callbacks.forEach((callback) => callback(0));
        }
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
        flushFrames();
        jest.restoreAllMocks();
    });

    test('schedules a single frame for multiple instances', () => {
        const first = {measure: jest.fn(() => true), onMeasured: jest.fn()};
        const second = {measure: jest.fn(() => false), onMeasured: jest.fn()};

        scheduleOverflowCheck({}, first);
        scheduleOverflowCheck({}, second);

        expect(rafSpy).toBeCalledTimes(1);

        flushFrames();
        expect(first.measure).toBeCalledTimes(1);
        expect(second.measure).toBeCalledTimes(1);
        expect(first.onMeasured).toBeCalledWith(true);
        expect(second.onMeasured).toBeCalledWith(false);
    });

    test('measures every entry before applying any result', () => {
        const order: string[] = [];
        const first = {
            measure: () => {
                order.push('measure first');
                return true;
            },
            onMeasured: () => order.push('apply first'),
        };
        const second = {
            measure: () => {
                order.push('measure second');
                return false;
            },
            onMeasured: () => order.push('apply second'),
        };

        scheduleOverflowCheck({}, first);
        scheduleOverflowCheck({}, second);
        flushFrames();

        expect(order).toEqual(['measure first', 'measure second', 'apply first', 'apply second']);
    });

    test('keeps only the latest entry per key', () => {
        const key = {};
        const stale = {measure: jest.fn(() => false), onMeasured: jest.fn()};
        const latest = {measure: jest.fn(() => true), onMeasured: jest.fn()};

        scheduleOverflowCheck(key, stale);
        scheduleOverflowCheck(key, latest);
        flushFrames();

        expect(stale.measure).not.toBeCalled();
        expect(latest.measure).toBeCalledTimes(1);
        expect(rafSpy).toBeCalledTimes(1);
    });

    test('does not measure a canceled entry', () => {
        const key = {};
        const check = {measure: jest.fn(() => true), onMeasured: jest.fn()};

        scheduleOverflowCheck(key, check);
        cancelOverflowCheck(key);
        flushFrames();

        expect(check.measure).not.toBeCalled();
        expect(check.onMeasured).not.toBeCalled();
    });

    test('queues checks while the document is hidden without scheduling frames', () => {
        const check = {measure: jest.fn(() => true), onMeasured: jest.fn()};

        setHidden(true);
        scheduleOverflowCheck({}, check);
        scheduleOverflowCheck({}, check);

        expect(rafSpy).not.toBeCalled();

        flushFrames();
        expect(check.measure).not.toBeCalled();
    });

    test('flushes queued checks in one frame when the document becomes visible again', () => {
        const first = {measure: jest.fn(() => true), onMeasured: jest.fn()};
        const second = {measure: jest.fn(() => false), onMeasured: jest.fn()};

        setHidden(true);
        scheduleOverflowCheck({}, first);
        scheduleOverflowCheck({}, second);

        setHidden(false);
        document.dispatchEvent(new Event('visibilitychange'));

        expect(rafSpy).toBeCalledTimes(1);

        flushFrames();
        expect(first.measure).toBeCalledTimes(1);
        expect(second.measure).toBeCalledTimes(1);
        expect(first.onMeasured).toBeCalledWith(true);
        expect(second.onMeasured).toBeCalledWith(false);
    });

    test('applies pending checks exactly once across a visibility transition with a frame already pending', () => {
        const check = {measure: jest.fn(() => true), onMeasured: jest.fn()};

        scheduleOverflowCheck({}, check);
        setHidden(true);
        setHidden(false);
        document.dispatchEvent(new Event('visibilitychange'));

        flushFrames();
        expect(check.measure).toBeCalledTimes(1);
        expect(check.onMeasured).toBeCalledTimes(1);
    });

    test('schedules a new frame for checks added after a flush', () => {
        scheduleOverflowCheck({}, {measure: () => true, onMeasured: jest.fn()});
        flushFrames();

        const second = {measure: jest.fn(() => false), onMeasured: jest.fn()};
        scheduleOverflowCheck({}, second);
        expect(rafSpy).toBeCalledTimes(2);

        flushFrames();
        expect(second.measure).toBeCalledTimes(1);
    });

    test('isolates a failing measure so the other entries still apply', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const failing = {
            measure: () => {
                throw new Error('measure boom');
            },
            onMeasured: jest.fn(),
        };
        const healthy = {measure: jest.fn(() => true), onMeasured: jest.fn()};

        scheduleOverflowCheck({}, failing);
        scheduleOverflowCheck({}, healthy);
        expect(() => flushFrames()).not.toThrow();

        expect(consoleSpy).toBeCalledTimes(1);
        expect(failing.onMeasured).not.toBeCalled();
        expect(healthy.measure).toBeCalledTimes(1);
        expect(healthy.onMeasured).toBeCalledWith(true);
    });

    test('isolates a failing onMeasured so the other entries still apply', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        const failing = {
            measure: () => true,
            onMeasured: () => {
                throw new Error('apply boom');
            },
        };
        const healthy = {measure: jest.fn(() => false), onMeasured: jest.fn()};

        scheduleOverflowCheck({}, failing);
        scheduleOverflowCheck({}, healthy);
        expect(() => flushFrames()).not.toThrow();

        expect(consoleSpy).toBeCalledTimes(1);
        expect(healthy.onMeasured).toBeCalledWith(false);
    });

    test('drains the queue with a fallback timer while hidden even without visibilitychange', () => {
        jest.useFakeTimers({doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame']});
        const key = {};
        const check = {measure: jest.fn(() => true), onMeasured: jest.fn()};

        setHidden(true);
        scheduleOverflowCheck(key, check);
        scheduleOverflowCheck(key, check);
        expect(rafSpy).not.toBeCalled();

        jest.advanceTimersByTime(1000);
        expect(check.measure).toBeCalledTimes(1);
        expect(check.onMeasured).toBeCalledWith(true);
        jest.useRealTimers();
    });

    test('clears the fallback timer when the visibility flush runs first', () => {
        jest.useFakeTimers({doNotFake: ['requestAnimationFrame', 'cancelAnimationFrame']});
        const key = {};
        const check = {measure: jest.fn(() => true), onMeasured: jest.fn()};

        setHidden(true);
        scheduleOverflowCheck(key, check);

        setHidden(false);
        document.dispatchEvent(new Event('visibilitychange'));
        flushFrames();
        expect(check.measure).toBeCalledTimes(1);

        jest.advanceTimersByTime(1000);
        expect(check.measure).toBeCalledTimes(1);
        jest.useRealTimers();
    });
});
