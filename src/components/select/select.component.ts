import { LitElement, html } from "lit";
import type { CSSResultGroup, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import {
    getAnimation,
    setDefaultAnimation,
} from "../../utilities/animation-registry.js";
import { animateTo, stopAnimations } from "../../internal/animate.js";
import { FormControlController } from "../../internal/form.js";
import { HasSlotController } from "../../internal/slot.js";
import { scrollIntoView } from "../../internal/scroll.js";
import { waitForEvent } from "../../internal/event.js";
import { watch } from "../../internal/watch.js";
import { emit } from "../../internal/emit.js";
import type { PcRemoveEvent } from "../../events/pc-remove.js";
import type { PcOption } from "../option/option.js";
import { PcIcon } from "../icon/icon.js";
import { PcPopup } from "../popup/popup.js";
import { PcTag } from "../tag/tag.js";
import { styles } from "./select.styles.js";

setDefaultAnimation("select.show", {
    keyframes: [
        { opacity: 0, transform: "scale(0.92)" },
        { opacity: 1, transform: "scale(1)" },
    ],
    options: {
        duration: 200,
        easing: "cubic-bezier(0.25, 0.8, 0.4, 1)",
    },
});

setDefaultAnimation("select.hide", {
    keyframes: [
        { opacity: 1, transform: "scale(1)" },
        { opacity: 0, transform: "scale(0.9)" },
    ],
    options: {
        duration: 150,
        easing: "cubic-bezier(0.4, 0, 1, 1)",
    },
});

/**
 * @summary Selects allow you to choose items from a menu of predefined options.
 * @status experimental
 * @since 0.5.1
 *
 * @dependency pc-icon
 * @dependency pc-popup
 * @dependency pc-tag
 *
 * @slot — The listbox options. Only `<pc-option>` and `<pc-divider>` elements can be slotted here. You can use `<pc-divider>` to group items visually.
 * @slot label — The input’s label. Alternatively, you can use the `label` attribute.
 * @slot prefix — Used to prepend a presentational icon or similar element to the combobox.
 * @slot suffix — Used to append a presentational icon or similar element to the combobox.
 * @slot clear-icon — An icon to use in place of the default clear icon.
 * @slot expand-icon — The icon to show when the select is expanded and collapsed. Rotates on open and close.
 * @slot hint — Text that describes how to use the input. Alternatively, you can use the `hint` attribute.
 *
 * @event pc-change — Emitted when the select’s value changes.
 * @event pc-clear — Emitted when the select’s value is cleared.
 * @event pc-input — Emitted when the select receives input.
 * @event pc-focus — Emitted when the select gains focus.
 * @event pc-blur — Emitted when the select loses focus.
 * @event pc-show — Emitted when the select’s menu opens.
 * @event pc-after-show — Emitted after the select’s menu opens and all animations are complete.
 * @event pc-hide — Emitted when the select’s menu closes.
 * @event pc-after-hide — Emitted after the select’s menu closes and all animations are complete.
 * @event pc-invalid — Emitted when the select has been checked for validity and its constraints aren’t satisfied.
 *
 * @csspart form-control — The form control that wraps the label, input and hint text.
 * @csspart label — The label’s wrapper.
 * @csspart input — The select’s wrapper.
 * @csspart hint — The hint’s wrapper.
 * @csspart combobox — The container the wraps the prefix, suffix, combobox, clear icon and expand button.
 * @csspart prefix — The container that wraps the prefix slot.
 * @csspart suffix — The container that wraps the suffix slot.
 * @csspart display-input — The element that displays the selected option’s label, an `<input>` element.
 * @csspart listbox — The listbox container where options are slotted.
 * @csspart tags — The container that houses option tags when `multiselect` is used.
 * @csspart tag — The individual tags that represent each multiselect option.
 * @csspart tag__base — The tag’s base part.
 * @csspart tag__content — The tag’s content part.
 * @csspart tag__remove-button — The tag’s remove button.
 * @csspart tag__remove-button__base — The tag’s remove button base part.
 * @csspart clear-button — The clear button.
 * @csspart expand-icon — The container that wraps the expand icon.
 */
@customElement("pc-select")
export class PcSelect extends LitElement {
    static styles: CSSResultGroup = styles;
    /** @internal This is an internal property. */
    static dependencies = {
        "pc-icon": PcIcon,
        "pc-popup": PcPopup,
        "pc-tag": PcTag,
    };

    // @ts-expect-error
    private readonly formControlController = new FormControlController(this, {
        assumeInteractionOn: ["pc-blur", "pc-input"],
    });
    private readonly hasSlotController = new HasSlotController(
        this,
        "label",
        "hint",
    );
    private typeToSelectString = "";
    private typeToSelectTimeout!: number;
    private closeWatcher!: CloseWatcher | null;

    /** @internal This is an internal property. */
    @query(".select") popup!: PcPopup;
    /** @internal This is an internal property. */
    @query(".select-combobox") combobox!: HTMLSlotElement;
    /** @internal This is an internal property. */
    @query(".select-input") displayInput!: HTMLInputElement;
    /** @internal This is an internal property. */
    @query(".select-value-input") valueInput!: HTMLInputElement;
    /** @internal This is an internal property. */
    @query(".select-listbox") listbox!: HTMLSlotElement;

    @state() private hasFocus = false;
    /** @internal This is an internal property. */
    @state() displayLabel = "";
    /** @internal This is an internal property. */
    @state() currentOption!: PcOption;
    /** @internal This is an internal property. */
    @state() selectedOptions: PcOption[] = [];
    @state() private valueHasChanged: boolean = false;

    /** The name of the select, submitted as a name/value pair with form data. */
    @property() name = "";

    private _value: string | string[] = "";

    /** The default value of the select. Primarily used for resetting the select. */
    @property({ attribute: "value" }) defaultValue: string | string[] = "";

    /** The select’s size. */
    @property({ reflect: true }) size: "small" | "medium" | "large" = "medium";

    /** Placeholder text to show as a hint when the select is empty. */
    @property() placeholder = "";

    /** Allows more than one option to be selected. */
    @property({ type: Boolean, reflect: true }) multiple = false;

    /** The maximum number of selected options to show when the `multiple` attribute is true. After the maximum limit, “+number” will be shown to indicate the number of additional items that are selected. Set the value to 0 to remove the limit. */
    @property({ attribute: "max-options-visible", type: Number })
    maxOptionsVisible = 3;

    /** Disables the select. */
    @property({ type: Boolean, reflect: true }) disabled = false;

    /** Adds a clear button when the select is not empty. */
    @property({ type: Boolean }) clearable = false;

    /** Indicates whether or not the select is open. You can toggle this attribute to show and hide the menu, or you can use the `show()` and `hide()` methods and this attribute will reflect the select’s open state. */
    @property({ type: Boolean, reflect: true }) open = false;

    /** Enable this option to prevent the listbox from being clipped when the component is placed inside a container with `overflow: auto|scroll`. Hoisting uses a fixed positioning strategy that works in many, but not all scenarios. */
    @property({ type: Boolean }) hoist = false;

    /** Draws a filled select control. */
    @property({ type: Boolean, reflect: true }) filled = false;

    /** Draws a pill‐style select. */
    @property({ type: Boolean, reflect: true }) pill = false;

    /** The select’s label. If you need to display HTML, use the `label` slot instead. */
    @property() label = "";

    /** The preferred placement of the select’s listbox. Note that the actual placement may vary to keep the listbox inside of the viewport. */
    @property({ reflect: true }) placement: "top" | "bottom" = "bottom";

    /** The select’s hint. If you need to display HTML, use the `hint` slot instead. */
    @property() hint = "";

    /** By default, form controls are associated with the nearest containing `<form>` element. This attribute allows you to place the form control outside of a form and associate it with the form that has this `id`. The form must be in the same document or shadow root for this to work. */
    @property({ reflect: true }) form = "";

    /** Indicates if the select must be filled in or not. */
    @property({ type: Boolean, reflect: true }) required = false;

    /** A function that customises the tags to be rendered when the `multiple` attribute is true. The first parameter is the option, the second parameter is the current tag’s index. The function should either return either a Lit `TemplateResult` or a string containing trusted HTML of the symbol to render at the specified value. */
    @property() getTag: (
        option: PcOption,
        index: number,
    ) => TemplateResult | string | HTMLElement = (option) => {
        return html`
            <pc-tag
                part="tag"
                size=${this.size}
                ?pill=${this.pill}
                removable
                @pc-remove=${(event: PcRemoveEvent) =>
                    this.handleTagRemove(event, option)}
                exportparts="
                    base:tag__base,
                    content:tag__content,
                    remove-button:tag__remove-button,
                    remove-button__base:tag__remove-button__base
                "
            >
                ${option.getTextLabel()}
            </pc-tag>
        `;
    };

    get value() {
        return this._value;
    }

    /** The current value of the select, submitted as a name/value pair with form data. When the `multiple` attribute is true, the `value` attribute will be a space‐delimited list of values based on the options selected, and the `value` property will be an array. **For this reason, values must not contain spaces.** */
    @state()
    set value(value: string | string[]) {
        if (this.multiple) {
            value = Array.isArray(value) ? value : value.split(" ");
        } else {
            value = Array.isArray(value) ? value.join(" ") : value;
        }

        if (this._value === value) {
            return;
        }

        this.valueHasChanged = true;
        this._value = value;
    }

    /** Gets the validity state object. */
    get validity() {
        return this.valueInput.validity;
    }

    /** Gets the validation message. */
    get validationMessage() {
        return this.valueInput.validationMessage;
    }

    connectedCallback() {
        super.connectedCallback();

        setTimeout(() => {
            this.handleDefaultSlotChange();
        });

        this.open = false;
    }

    private addOpenListeners() {
        document.addEventListener("focusin", this.handleDocumentFocusIn);
        document.addEventListener("keydown", this.handleDocumentKeyDown);
        document.addEventListener("mousedown", this.handleDocumentMouseDown);

        if (this.getRootNode() !== document) {
            this.getRootNode().addEventListener(
                "focusin",
                this.handleDocumentFocusIn,
            );
        }

        if ("CloseWatcher" in window) {
            this.closeWatcher?.destroy();
            this.closeWatcher = new CloseWatcher();
            this.closeWatcher.onclose = () => {
                if (this.open) {
                    this.hide();
                    this.displayInput.focus({ preventScroll: true });
                }
            };
        }
    }

    private removeOpenListeners() {
        document.removeEventListener("focusin", this.handleDocumentFocusIn);
        document.removeEventListener("keydown", this.handleDocumentKeyDown);
        document.removeEventListener("mousedown", this.handleDocumentMouseDown);

        if (this.getRootNode() !== document) {
            this.getRootNode().removeEventListener(
                "focusin",
                this.handleDocumentFocusIn,
            );
        }

        this.closeWatcher?.destroy();
    }

    private handleFocus() {
        this.hasFocus = true;
        this.displayInput.setSelectionRange(0, 0);
        emit(this, "pc-focus");
    }

    private handleBlur() {
        this.hasFocus = false;
        emit(this, "pc-blur");
    }

    private handleDocumentFocusIn = (event: Event) => {
        const path = (event as FocusEvent).composedPath();

        if (this && !path.includes(this)) {
            this.hide();
        }
    };

    private handleDocumentKeyDown = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement;
        const isClearButton = target.closest(".clear-button") !== null;
        const isIconButton = target.closest("pc-icon-button") !== null;

        if (isClearButton || isIconButton) {
            return;
        }

        if (event.key === "Escape" && this.open && !this.closeWatcher) {
            event.preventDefault();
            event.stopPropagation();
            this.hide();
            this.displayInput.focus({ preventScroll: true });
        }

        if (
            event.key === "Enter" ||
            (event.key === " " && this.typeToSelectString === "")
        ) {
            event.preventDefault();
            event.stopImmediatePropagation();

            if (!this.open) {
                this.show();
                return;
            }

            if (this.currentOption && !this.currentOption.disabled) {
                this.valueHasChanged = true;

                if (this.multiple) {
                    this.toggleOptionSelection(this.currentOption);
                } else {
                    this.setSelectedOptions(this.currentOption);
                }

                this.updateComplete.then(() => {
                    emit(this, "pc-input");
                    emit(this, "pc-change");
                });

                if (!this.multiple) {
                    this.hide();
                    this.displayInput.focus({ preventScroll: true });
                }
            }

            return;
        }

        if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
            const allOptions = this.getAllOptions();
            const currentIndex = allOptions.indexOf(this.currentOption);
            let newIndex = Math.max(0, currentIndex);

            event.preventDefault();

            if (!this.open) {
                this.show();

                if (this.currentOption) {
                    return;
                }
            }

            if (event.key === "ArrowUp") {
                newIndex = currentIndex - 1;
                if (newIndex < 0) {
                    newIndex = allOptions.length - 1;
                }
            } else if (event.key === "ArrowDown") {
                newIndex = currentIndex + 1;
                if (newIndex > allOptions.length - 1) {
                    newIndex = 0;
                }
            } else if (event.key === "Home") {
                newIndex = 0;
            } else if (event.key === "End") {
                newIndex = allOptions.length - 1;
            }

            this.setCurrentOption(allOptions[newIndex]);
        }

        if (
            (event.key && event.key.length === 1) ||
            event.key === "Backspace"
        ) {
            const allOptions = this.getAllOptions();

            // Don’t block modifier keys
            if (event.metaKey || event.ctrlKey || event.altKey) {
                return;
            }

            if (!this.open) {
                if (event.key === "Backspace") {
                    return;
                }

                this.show();
            }

            event.stopPropagation();
            event.preventDefault();

            clearTimeout(this.typeToSelectTimeout);

            this.typeToSelectTimeout = window.setTimeout(() => {
                this.typeToSelectString = "";
            }, 1000);

            if (event.key === "Backspace") {
                this.typeToSelectString = this.typeToSelectString.slice(0, -1);
            } else {
                this.typeToSelectString += event.key.toLowerCase();
            }

            for (const option of allOptions) {
                const label = option.getTextLabel().toLowerCase();

                if (label.startsWith(this.typeToSelectString)) {
                    this.setCurrentOption(option);
                    break;
                }
            }
        }
    };

    private handleDocumentMouseDown = (event: MouseEvent) => {
        const path = event.composedPath();

        if (this && !path.includes(this)) {
            this.hide();
        }
    };

    private handleLabelClick() {
        this.displayInput.focus();
    }

    private handleComboboxMouseDown(event: MouseEvent) {
        const path = event.composedPath();
        const isIconButton = path.some(
            (element) =>
                element instanceof Element &&
                element.tagName.toLowerCase() === "pc-icon-button",
        );

        if (this.disabled || isIconButton) {
            return;
        }

        event.preventDefault();
        this.displayInput.focus({ preventScroll: true });
        this.open = !this.open;
    }

    private handleComboboxKeyDown(event: KeyboardEvent) {
        if (event.key === "Tab") {
            return;
        }

        event.stopPropagation();
        this.handleDocumentKeyDown(event);
    }

    private handleClearClick(event: MouseEvent) {
        event.stopPropagation();

        this.valueHasChanged = true;

        if (this.value !== "") {
            this.setSelectedOptions([]);
            this.displayInput.focus({ preventScroll: true });

            this.updateComplete.then(() => {
                emit(this, "pc-clear");
                emit(this, "pc-input");
                emit(this, "pc-change");
            });
        }
    }

    private handleClearMouseDown(event: MouseEvent) {
        event.stopPropagation();
        event.preventDefault();
    }

    private handleOptionClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        const option = target.closest("pc-option") as PcOption | null;
        const oldValue = this.value;

        if (option && !option.disabled) {
            this.valueHasChanged = true;
            if (this.multiple) {
                this.toggleOptionSelection(option);
            } else {
                this.setSelectedOptions(option);
            }

            this.updateComplete.then(() =>
                this.displayInput.focus({ preventScroll: true }),
            );

            if (this.value !== oldValue) {
                this.updateComplete.then(() => {
                    emit(this, "pc-input");
                    emit(this, "pc-change");
                });
            }

            if (!this.multiple) {
                this.hide();
                this.displayInput.focus({ preventScroll: true });
            }
        }
    }

    // @internal Used by options to update labels
    public handleDefaultSlotChange() {
        if (!customElements.get("pc-option")) {
            customElements
                .whenDefined("pc-option")
                .then(() => this.handleDefaultSlotChange());
        }

        const allOptions = this.getAllOptions();
        const val = this.valueHasChanged ? this.value : this.defaultValue;
        const value = Array.isArray(val) ? val : [val];
        const values: string[] = [];

        allOptions.forEach((option) => values.push(option.value));

        this.setSelectedOptions(
            allOptions.filter((element) => value.includes(element.value)),
        );
    }

    private handleTagRemove(event: PcRemoveEvent, option: PcOption) {
        event.stopPropagation();

        this.valueHasChanged = true;

        if (!this.disabled) {
            this.toggleOptionSelection(option, false);

            this.updateComplete.then(() => {
                emit(this, "pc-input");
                emit(this, "pc-change");
            });
        }
    }

    private getAllOptions() {
        return [...this.querySelectorAll<PcOption>("pc-option")];
    }

    private getFirstOption() {
        return this.querySelector<PcOption>("pc-option");
    }

    private setCurrentOption(option: PcOption | null) {
        const allOptions = this.getAllOptions();

        allOptions.forEach((element) => {
            element.current = false;
            element.tabIndex = -1;
        });

        if (option) {
            this.currentOption = option;
            option.current = true;
            option.tabIndex = 0;
            option.focus();
        }
    }

    private setSelectedOptions(option: PcOption | PcOption[]) {
        const allOptions = this.getAllOptions();
        const newSelectedOptions = Array.isArray(option) ? option : [option];

        allOptions.forEach((element) => (element.selected = false));

        if (newSelectedOptions.length) {
            newSelectedOptions.forEach((element) => (element.selected = true));
        }

        this.selectionChanged();
    }

    private toggleOptionSelection(option: PcOption, force?: boolean) {
        if (force === true || force === false) {
            option.selected = force;
        } else {
            option.selected = !option.selected;
        }

        this.selectionChanged();
    }

    private selectionChanged() {
        const options = this.getAllOptions();
        this.selectedOptions = options.filter((element) => element.selected);

        const cachedValueHasChanged = this.valueHasChanged;

        if (this.multiple) {
            this.value = this.selectedOptions.map((element) => element.value);

            if (this.placeholder && this.value.length === 0) {
                this.displayLabel = "";
            } else {
                const optionsSelected = this.selectedOptions.length;

                if (optionsSelected === 0) {
                    this.displayLabel = "No options selected";
                } else if (optionsSelected === 1) {
                    this.displayLabel = "One option selected";
                } else {
                    this.displayLabel = `${optionsSelected} options selected`;
                }
            }
        } else {
            const selectedOption = this.selectedOptions[0];
            this.value = selectedOption?.value ?? "";
            this.displayLabel = selectedOption?.getTextLabel?.() ?? "";
        }
        this.valueHasChanged = cachedValueHasChanged;

        this.updateComplete.then(() => {
            this.formControlController.updateValidity();
        });
    }

    /** @internal This is an internal property. */
    protected get tags() {
        return this.selectedOptions.map((option, index) => {
            if (index < this.maxOptionsVisible || this.maxOptionsVisible <= 0) {
                const tag = this.getTag(option, index);
                return html`
                    <div
                        @pc-remove=${(event: PcRemoveEvent) =>
                            this.handleTagRemove(event, option)}
                    >
                        ${typeof tag === "string" ? unsafeHTML(tag) : tag}
                    </div>
                `;
            } else if (index === this.maxOptionsVisible) {
                return html`
                    <pc-tag size=${this.size}>
                        +${this.selectedOptions.length - index}
                    </pc-tag>
                `;
            }
            return html``;
        });
    }

    private handleInvalid(event: Event) {
        this.formControlController.setValidity(false);
        this.formControlController.emitInvalidEvent(event);
    }

    @watch("disabled", { waitUntilFirstUpdate: true })
    handleDisabledChange() {
        if (this.disabled) {
            this.open = false;
            this.handleOpenChange();
        }
    }

    attributeChangedCallback(
        name: string,
        oldValue: string | null,
        newValue: string | null,
    ) {
        super.attributeChangedCallback(name, oldValue, newValue);

        /** This is a backwards compatibility call. In the next major version, we should make a clean separation between “value”, the attribute mapping to the “defaultValue” property, and “value”, the non‐reflecting property. */
        if (name === "value") {
            const cachedValueHasChanged = this.valueHasChanged;
            this.value = this.defaultValue;

            this.valueHasChanged = cachedValueHasChanged;
        }
    }

    @watch(["defaultValue", "value"], { waitUntilFirstUpdate: true })
    handleValueChange() {
        if (!this.valueHasChanged) {
            const cachedValueHasChanged = this.valueHasChanged;
            this.value = this.defaultValue;

            this.valueHasChanged = cachedValueHasChanged;
        }

        const allOptions = this.getAllOptions();
        const value = Array.isArray(this.value) ? this.value : [this.value];

        this.setSelectedOptions(
            allOptions.filter((element) => value.includes(element.value)),
        );
    }

    @watch("open", { waitUntilFirstUpdate: true })
    async handleOpenChange() {
        if (this.open && !this.disabled) {
            this.setCurrentOption(
                this.selectedOptions[0] || this.getFirstOption(),
            );

            emit(this, "pc-show");
            this.addOpenListeners();

            await stopAnimations(this);
            this.listbox.hidden = false;
            this.popup.active = true;

            requestAnimationFrame(() => {
                this.setCurrentOption(this.currentOption);
            });

            const { keyframes, options } = getAnimation(this, "select.show", {
                dir: document.documentElement.dir || "ltr",
            });
            await animateTo(this.popup.popup, keyframes, options);

            if (this.currentOption) {
                scrollIntoView(
                    this.currentOption,
                    this.listbox,
                    "vertical",
                    "auto",
                );
            }

            emit(this, "pc-after-show");
        } else {
            emit(this, "pc-hide");
            this.removeOpenListeners();

            await stopAnimations(this);
            const { keyframes, options } = getAnimation(this, "select.hide", {
                dir: document.documentElement.dir || "ltr",
            });
            await animateTo(this.popup.popup, keyframes, options);
            this.listbox.hidden = true;
            this.popup.active = false;

            emit(this, "pc-after-hide");
        }
    }

    /** Shows the listbox. */
    async show() {
        if (this.open || this.disabled) {
            this.open = false;
            return undefined;
        }

        this.open = true;
        return waitForEvent(this, "pc-after-show");
    }

    /** Hides the listbox. */
    async hide() {
        if (!this.open || this.disabled) {
            this.open = false;
            return undefined;
        }

        this.open = false;
        return waitForEvent(this, "pc-after-hide");
    }

    /** Checks for validity but does not show a validation message. Returns `true` when valid and `false` when invalid. */
    checkValidity() {
        return this.valueInput.checkValidity();
    }

    /** Gets the associated form, if one exists. */
    getForm(): HTMLFormElement | null {
        return this.formControlController.getForm();
    }

    /** Checks for validity and shows the browser’s validation message if the control is invalid. */
    reportValidity() {
        return this.valueInput.reportValidity();
    }

    /** Sets a custom validation message. Pass an empty string to restore validity. */
    setCustomValidity(message: string) {
        this.valueInput.setCustomValidity(message);
        this.formControlController.updateValidity();
    }

    /** Focuses the control. */
    focus(options?: FocusOptions) {
        this.displayInput.focus(options);
    }

    /** Unfocuses the select (i.e. blurs it). */
    blur() {
        this.displayInput.blur();
    }

    render() {
        const hasLabelSlot = this.hasSlotController.test("label");
        const hasHintSlot = this.hasSlotController.test("hint");
        const hasLabel = this.label ? true : !!hasLabelSlot;
        const hasHint = this.hint ? true : !!hasHintSlot;
        const hasClearIcon =
            this.clearable && !this.disabled && this.value.length > 0;
        const isPlaceholderVisible =
            this.placeholder && this.value && this.value.length <= 0;

        return html`
            <div
                part="form-control"
                class=${classMap({
                    "form-control": true,
                    "form-control-small": this.size === "small",
                    "form-control-medium": this.size === "medium",
                    "form-control-large": this.size === "large",
                    "form-control-has-label": hasLabel,
                    "form-control-has-hint": hasHint,
                })}
            >
                <label
                    part="label"
                    class="label"
                    id="label"
                    @click=${this.handleLabelClick}
                    aria-hidden=${hasLabel ? "false" : "true"}
                >
                    <slot name="label">${this.label}</slot>
                </label>

                <div part="input" class="form-control-input">
                    <pc-popup
                        class=${classMap({
                            "select": true,
                            "select-standard": this.filled === false,
                            "select-filled": this.filled === true,
                            "select-pill": this.pill === true,
                            "select-open": this.open === true,
                            "select-disabled": this.disabled === true,
                            "select-multiple": this.multiple === true,
                            "select-focused": this.hasFocus === true,
                            "select-placeholder-visible":
                                isPlaceholderVisible === true,
                            "select-top": this.placement === "top",
                            "select-bottom": this.placement === "bottom",
                            "select-small": this.size === "small",
                            "select-medium": this.size === "medium",
                            "select-large": this.size === "large",
                        })}
                        placement=${this.placement}
                        strategy=${this.hoist ? "fixed" : "absolute"}
                        sync="width"
                        auto-size="vertical"
                        auto-size-padding="10"
                        shift
                        flip
                    >
                        <div
                            part="combobox"
                            class="select-combobox"
                            slot="anchor"
                            @mousedown=${this.handleComboboxMouseDown}
                            @keydown=${this.handleComboboxKeyDown}
                        >
                            <slot
                                class="prefix"
                                part="prefix"
                                name="prefix"
                            ></slot>

                            <input
                                part="display-input"
                                class="select-input"
                                type="text"
                                role="combobox"
                                placeholder=${this.placeholder}
                                .disabled=${this.disabled}
                                .value=${this.displayLabel}
                                autocomplete="off"
                                spellcheck="false"
                                autocapitalize="off"
                                aria-controls="listbox"
                                aria-expanded=${this.open ? "true" : "false"}
                                aria-haspopup="listbox"
                                aria-labelledby="label"
                                aria-disabled=${this.disabled
                                    ? "true"
                                    : "false"}
                                aria-describedby="hint"
                                tabindex="0"
                                readonly
                                @focus=${this.handleFocus}
                                @blur=${this.handleBlur}
                            />

                            ${this.multiple
                                ? html`
                                      <div part="tags" class="select-tags">
                                          ${this.tags}
                                      </div>
                                  `
                                : ""}

                            <input
                                class="select-value-input"
                                type="text"
                                ?disabled=${this.disabled}
                                ?required=${this.required}
                                .value=${Array.isArray(this.value)
                                    ? this.value.join(", ")
                                    : this.value}
                                tabindex="-1"
                                aria-hidden="true"
                                @focus=${() => this.focus()}
                                @invalid=${this.handleInvalid}
                            />

                            ${hasClearIcon
                                ? html`
                                      <button
                                          part="clear-button"
                                          class="clear-select-button"
                                          type="button"
                                          aria-label="Clear selection"
                                          @click=${this.handleClearClick}
                                          @mousedown=${this
                                              .handleClearMouseDown}
                                          tabindex="-1"
                                      >
                                          <slot name="clear-icon">
                                              <pc-icon
                                                  library="system"
                                                  icon-style="regular"
                                                  name="circle-xmark"
                                              ></pc-icon>
                                          </slot>
                                      </button>
                                  `
                                : ""}

                            <slot
                                class="suffix"
                                part="suffix"
                                name="suffix"
                            ></slot>

                            <slot
                                class="expand-icon"
                                part="expand-icon"
                                name="expand-icon"
                            >
                                <pc-icon
                                    library="system"
                                    icon-style="solid"
                                    name="chevron-down"
                                ></pc-icon>
                            </slot>
                        </div>

                        <div
                            part="listbox"
                            class="select-listbox"
                            id="listbox"
                            role="listbox"
                            aria-expanded=${this.open ? "true" : "false"}
                            aria-multiselectable=${this.multiple
                                ? "true"
                                : "false"}
                            aria-labelledby="label"
                            tabindex="-1"
                            @mouseup=${this.handleOptionClick}
                            @slotchange=${this.handleDefaultSlotChange}
                        >
                            <slot></slot>
                        </div>
                    </pc-popup>

                    <div
                        part="hint"
                        class="hint"
                        id="hint"
                        aria-hidden=${hasHint ? "false" : "true"}
                    >
                        <slot name="hint">${this.hint}</slot>
                    </div>
                </div>
            </div>
        `;
    }
}
