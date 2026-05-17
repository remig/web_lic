import {LitElement, html} from 'lit';
import {customElement, query, state} from 'lit/decorators.js';
import {LicDialogBase} from './dialog_base';
import {DialogService} from './dialog_service';

@customElement('lic-hello-dialog')
export class LicHelloDialog extends LitElement {

	@query('lic-dialog-base') private baseDialog!: LicDialogBase;
	@state() private dialogTitle = '';

	override createRenderRoot() {return this;}

	override connectedCallback() {
		super.connectedCallback();
		DialogService.register('hello-world', (title) => {
			this.dialogTitle = title;
			return () => this.baseDialog.open();
		});
	}

	override disconnectedCallback() {
		super.disconnectedCallback();
		DialogService.unregister('hello-world');
	}

	render() {
		return html`
			<lic-dialog-base .title=${this.dialogTitle} .width=${300}>
				<p>Hello World</p>
				<lic-button slot="footer" type="ok" @click=${() => this.baseDialog.close()}></lic-button>
			</lic-dialog-base>
		`;
	}
}
