import {LitElement, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {tr} from '../../translations';
import './lic_button.css';

type ButtonType = 'primary' | 'text' | 'ok' | 'cancel' | 'default';
type ButtonSize = 'small' | 'medium' | '';

@customElement('lic-button')
export class LicButton extends LitElement {
    @property({reflect: true}) type: ButtonType = 'default';
    @property() icon = '';
    @property() label = '';
    @property({type: Boolean, reflect: true}) disabled = false;
    @property({reflect: true}) size: ButtonSize = '';

    override createRenderRoot() {return this;}

    render() {
        const label = this.type === 'ok' ? tr('dialog.ok')
            : this.type === 'cancel' ? tr('dialog.cancel')
            : this.label;
        return html`
            <button type="button" class="lic-btn" ?disabled=${this.disabled}>
                ${this.icon ? html`<i class=${this.icon}></i>` : ''}
                ${label}
            </button>
        `;
    }
}
