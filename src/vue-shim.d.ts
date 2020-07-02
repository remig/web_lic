declare module '*.vue' {
	import Vue from 'vue';
	export default Vue;
}

declare module 'vue/types/vue' {
	interface VueConstructor<Vue> {
		tr: any,
		_: any
	}
}

declare module 'element-ui/lib/locale/lang/en' {}

// TODO: Find proper external types for these global libraries
declare function saveAs(blob: any, filename: string): void;

declare interface JSZip {
	new (): this;
	(): JSZip;
	prototype: JSZip;
	folder(name: string): JSZip;
	file(path: string, data: string, config?: {base64: boolean}): any;
	generateAsync(options: any): any;
}

declare const JSZip: JSZip;

declare interface jsPDF {
	new (
		orientation: 'landscape' | 'portrait',
		unit: 'pt',
		size: number[]
	): this;
	addImage(
		data: any, type: 'PNG', x: number, y: number, width: number, height: number
	);
	addPage(width: number, height: number);
	save(filename: string);
}

declare const jsPDF: jsPDF;

interface jsonpatchOperation {
	op: string, path: string, value?: any;
}

declare interface jsonpatch {
	applyOperation<T>(
		root: T,
		action: jsonpatchOperation
	);
}

declare const jsonpatch: jsonpatch;
