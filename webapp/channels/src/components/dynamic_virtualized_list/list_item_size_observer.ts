// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

type TrackedItemCallback = (changedHeight: number) => void;
type TrackedItemData = {element: Element; callback: TrackedItemCallback};

export class ListItemSizeObserver {
    private observer: ResizeObserver;

    private trackedItems: Map<string, TrackedItemData> = new Map();
    private elementToItemId: Map<Element, string> = new Map();

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
            const resizedElement = resizeEntry.target;

            const itemId = this.elementToItemId.get(resizedElement);
            if (!itemId) {
                return;
            }

            const itemData = this.trackedItems.get(itemId);
            if (!itemData) {
                return;
            }

            const changedHeight = Math.ceil(resizeEntry.borderBoxSize[0].blockSize);
            itemData.callback(changedHeight);
        });
    };

    public observe(itemId: string, element: Element, callback: TrackedItemCallback): () => void {
        const existing = this.trackedItems.get(itemId);
        if (existing && existing.element !== element) {
            this.observer.unobserve(existing.element);
            this.elementToItemId.delete(existing.element);
        }

        this.trackedItems.set(itemId, {element, callback});
        this.elementToItemId.set(element, itemId);
        this.observer.observe(element);

        return () => this.unobserve(itemId);
    }

    private unobserve(itemId: string): void {
        const trackedItemToUnobserve = this.trackedItems.get(itemId);
        if (trackedItemToUnobserve) {
            this.observer.unobserve(trackedItemToUnobserve.element);
            this.elementToItemId.delete(trackedItemToUnobserve.element);
            this.trackedItems.delete(itemId);
        }
    }

    public clear(): void {
        this.trackedItems.forEach((trackedItem) => {
            this.observer.unobserve(trackedItem.element);
        });
        this.trackedItems.clear();
        this.elementToItemId.clear();
    }
}
