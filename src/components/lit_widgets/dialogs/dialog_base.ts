import {LitElement, html, unsafeCSS} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import dialogBaseCss from './dialog_base.css?inline';

@customElement('lic-dialog-base')
export class LicDialogBase extends LitElement {

	@property() title = '';
	@property({type: Number}) width = 400;

	@query('dialog') private nativeDialog!: HTMLDialogElement;

	static styles = unsafeCSS(dialogBaseCss);

	open() {this.nativeDialog.showModal();}
	close() {this.nativeDialog.close();}

	render() {
		return html`
			<dialog style="width: ${this.width}px">
				<div class="lic-dialog-header">
					<span class="lic-dialog-title">${this.title}</span>
				</div>
				<div class="lic-dialog-body">
					<slot></slot>
				</div>
				<div class="lic-dialog-footer">
					<slot name="footer"></slot>
				</div>
			</dialog>
		`;
	}
}
