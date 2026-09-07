// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type TrackedItemCallback = (changedHeight: number) => void;

export class ListItemSizeObserver {
    private observer: ResizeObserver;

    private trackedElements: Map<Element, TrackedItemCallback> = new Map();

    private static instance: ListItemSizeObserver | null = null;

    private constructor() {
        this.observer = new ResizeObserver(this.handleResizeObserver);
    }

    public static getInstance(): ListItemSizeObserver {
        if (!ListItemSizeObserver.instance) {
            // Following class based singleton pattern to avoid multiple instances of the observer
            ListItemSizeObserver.instance = new ListItemSizeObserver();
        }
        return ListItemSizeObserver.instance;
    }

    private handleResizeObserver = (resizeEntries: ResizeObserverEntry[]) => {
        resizeEntries.forEach((resizeEntry) => {
            const callback = this.trackedElements.get(resizeEntry.target);
            if (!callback) {
                return;
            }

            callback(Math.ceil(resizeEntry.borderBoxSize[0].blockSize));
        });
    };

    public observe(element: Element, callback: TrackedItemCallback): () => void {
        this.trackedElements.set(element, callback);
        this.observer.observe(element);

        return () => this.unobserve(element);
    }

    private unobserve(element: Element): void {
        if (this.trackedElements.delete(element)) {
            this.observer.unobserve(element);
        }
    }
}
