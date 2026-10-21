// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type OverflowCheck = {
    measure: () => boolean;
    onMeasured: (isOverflow: boolean) => void;
};

const pendingOverflowChecks = new Map<object, OverflowCheck>();
const HIDDEN_FLUSH_DELAY_MS = 1000;
let hiddenFlushTimerId: number | null = null;

function flushPendingOverflowChecks() {
    if (hiddenFlushTimerId !== null) {
        window.clearTimeout(hiddenFlushTimerId);
        hiddenFlushTimerId = null;
    }

    const checks = Array.from(pendingOverflowChecks.values());
    pendingOverflowChecks.clear();

    const measurements = checks.map((check) => {
        try {
            return check.measure();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('overflow measure failed', err);
            return undefined;
        }
    });
    checks.forEach((check, index) => {
        const measurement = measurements[index];
        if (measurement === undefined) {
            return;
        }
        try {
            check.onMeasured(measurement);
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('overflow check failed', err);
        }
    });
}

function handleVisibilityChange() {
    if (!document.hidden && pendingOverflowChecks.size > 0) {
        window.requestAnimationFrame(flushPendingOverflowChecks);
    }
}

document.addEventListener('visibilitychange', handleVisibilityChange);

export function scheduleOverflowCheck(key: object, check: OverflowCheck) {
    const wasEmpty = pendingOverflowChecks.size === 0;
    pendingOverflowChecks.set(key, check);
    if (document.hidden) {
        // RM-618577: file drainée même si visibilitychange ne part pas
        if (hiddenFlushTimerId === null) {
            hiddenFlushTimerId = window.setTimeout(() => {
                hiddenFlushTimerId = null;
                flushPendingOverflowChecks();
            }, HIDDEN_FLUSH_DELAY_MS);
        }
        return;
    }
    if (wasEmpty) {
        window.requestAnimationFrame(flushPendingOverflowChecks);
    }
}

export function cancelOverflowCheck(key: object) {
    pendingOverflowChecks.delete(key);
}
