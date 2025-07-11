import { LitElement, html } from "lit";
import type { CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { classMap } from "lit/directives/class-map.js";
import { ifDefined } from "lit/directives/if-defined.js";
import { emit } from "../../internal/emit.js";
import { PcIcon } from "../icon/icon.js";
import { styles } from "./icon-button.styles.js";

@customElement("pc-icon-button")
export class PcIconButton extends LitElement {
    static styles: CSSResultGroup = styles;
    static dependencies = { "pc-icon": PcIcon };

    @query(".icon-button") button!: HTMLButtonElement | HTMLLinkElement;

    @state() private hasFocus = false;

    @property({ type: Boolean, reflect: true }) disabled = false;

    @property() download?: string;

    @property() href?: string;

    @property({ attribute: "icon-style" }) iconStyle?: string;

    @property() label = "";

    @property() library?: string;

    @property() name?: string;

    @property() src?: string;

    @property() target?: "_blank" | "_parent" | "_self" | "_top";

    private handleClick(event: MouseEvent) {
        if (this.disabled) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    private handleFocus() {
        this.hasFocus = true;
        emit(this, "pc-focus");
    }

    private handleBlur() {
        this.hasFocus = false;
        emit(this, "pc-blur");
    }

    click() {
        this.button.click();
    }

    focus(options?: FocusOptions) {
        this.button.focus(options);
    }

    blur() {
        this.button.blur();
    }

    render() {
        const isLink = this.href ? true : false;

        return html`
            ${isLink
                ? html`
                      <a
                          part="base"
                          class=${classMap({
                              "icon-button": true,
                              "icon-button-disabled": this.disabled === true,
                              "icon-button-focused": this.hasFocus === true,
                          })}
                          href=${ifDefined(this.href)}
                          target=${ifDefined(this.target)}
                          download=${ifDefined(this.download)}
                          rel=${ifDefined(
                              this.target ? "noreferrer noopener" : undefined,
                          )}
                          aria-label=${this.label}
                          tabindex=${this.disabled ? "-1" : "0"}
                          @click=${this.handleClick}
                          @focus=${this.handleFocus}
                          @blur=${this.handleBlur}
                      >
                          <pc-icon
                              class="icon"
                              library=${ifDefined(this.library)}
                              icon-style=${ifDefined(this.iconStyle)}
                              name=${ifDefined(this.name)}
                              src=${ifDefined(this.src)}
                              aria-hidden="true"
                          ></pc-icon>
                      </a>
                  `
                : html`
                      <button
                          part="base"
                          class=${classMap({
                              "icon-button": true,
                              "icon-button-disabled": this.disabled === true,
                              "icon-button-focused": this.hasFocus === true,
                          })}
                          type="button"
                          aria-label=${this.label}
                          aria-disabled=${this.disabled ? "true" : "false"}
                          tabindex=${this.disabled ? "-1" : "0"}
                          @click=${this.handleClick}
                          @focus=${this.handleFocus}
                          @blur=${this.handleBlur}
                      >
                          <pc-icon
                              class="icon"
                              library=${ifDefined(this.library)}
                              icon-style=${ifDefined(this.iconStyle)}
                              name=${ifDefined(this.name)}
                              src=${ifDefined(this.src)}
                              aria-hidden="true"
                          ></pc-icon>
                      </button>
                  `}
        `;
    }
}
