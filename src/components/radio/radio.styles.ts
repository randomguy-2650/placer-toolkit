import { css } from "lit";

export const styles = css`
    :host {
        display: block;
    }

    :host(:focus-visible) {
        outline: 0;
    }

    .radio {
        display: inline-flex;
        align-items: top;
        font-family: var(--pc-input-font-family);
        font-size: var(--pc-input-font-size-m);
        font-weight: var(--pc-input-font-weight);
        color: var(--pc-input-label-color);
        vertical-align: middle;
        cursor: pointer;
    }

    .radio-small {
        --toggle-size: var(--pc-toggle-size-s);
        font-size: var(--pc-input-font-size-s);
    }

    .radio-medium {
        --toggle-size: var(--pc-toggle-size-m);
        font-size: var(--pc-input-font-size-m);
    }

    .radio-large {
        --toggle-size: var(--pc-toggle-size-l);
        font-size: var(--pc-input-font-size-l);
    }

    .checked-icon {
        display: inline-flex;
        width: var(--toggle-size);
        height: var(--toggle-size);
        opacity: 0;
        transition: opacity 0.15s ease-in-out;
    }

    .radio-checked .checked-icon {
        opacity: 1;
    }

    .radio-control {
        display: inline-flex;
        position: relative;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: var(--toggle-size);
        height: var(--toggle-size);
        border: var(--pc-input-border-width) solid var(--pc-input-border-color);
        border-radius: var(--pc-border-radius-circle);
        background-color: transparent;
        color: transparent;
        transition: all var(--pc-transition-fast) ease-in-out;
    }

    .radio-input {
        position: absolute;
        margin: 0;
        padding: 0;
        opacity: 0;
        pointer-events: none;
        transition: opacity var(--pc-transition-fast) ease-in-out;
    }

    .radio:not(.radio-checked):not(.radio-disabled) .radio-control:hover,
    .radio:not(.radio-checked):not(.radio-disabled)
        .radio-control:focus-visible {
        border-color: var(--pc-input-border-color-hover);
    }

    .radio:not(.radio-checked):not(.radio-disabled) .radio-control:active {
        border-color: var(--pc-input-border-color-active);
    }

    .radio-checked .radio-control {
        color: var(--pc-color-neutral-0);
        background-color: var(--pc-color-primary-500);
        border-color: var(--pc-color-primary-500);
    }

    .radio.radio-checked:not(.radio-disabled) .radio-control:hover,
    .radio.radio-checked:not(.radio-disabled) .radio-control:focus-visible {
        background-color: var(--pc-color-primary-600);
        border-color: var(--pc-color-primary-600);
    }

    .radio.radio-checked:not(.radio-disabled) .radio-control:active {
        background-color: var(--pc-color-primary-400);
        border-color: var(--pc-color-primary-400);
    }

    :host(:focus-visible) .radio-control {
        outline: var(--pc-focus-ring);
        outline-offset: var(--pc-focus-ring-offset);
    }

    .radio-disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    /* If the radio isn’t checked, hide the circle icon in High Contrast mode on Windows */
    .radio:not(.radio-checked) svg {
        opacity: 0;
    }

    .label {
        display: inline-block;
        color: var(--pc-input-label-color);
        line-height: var(--toggle-size);
        margin-inline-start: 0.5em;
        user-select: none;
        -webkit-user-select: none;
    }

    :host([required]) .label::after {
        content: var(--pc-input-required-content);
        color: var(--pc-input-required-content-color);
        margin-inline-start: var(--pc-input-required-content-offset);
    }
`;
