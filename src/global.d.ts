import type { CSSResultGroup } from "lit";

declare module "*.css" {
    export const styles: CSSResultGroup;
}

declare global {
    interface HTMLInputElement {
        showPicker: () => void;
    }

    interface CloseWatcher extends EventTarget {
        new (options?: CloseWatcherOptions): CloseWatcher;
        requestClose(): void;
        close(): void;
        destroy(): void;

        oncancel: (event: Event) => void | null;
        onclose: (event: Event) => void | null;
    }

    declare const CloseWatcher: CloseWatcher;

    interface CloseWatcherOptions {
        signal: AbortSignal;
    }

    declare interface Window {
        CloseWatcher?: CloseWatcher;
    }
}
