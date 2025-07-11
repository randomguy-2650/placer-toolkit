import { PcAvatar } from "./avatar.component.js";

export * from "./avatar.component.js";
export default PcAvatar;

declare global {
    interface HTMLElementTagNameMap {
        "pc-avatar": PcAvatar;
    }
}
