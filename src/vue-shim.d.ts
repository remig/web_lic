declare module '*.vue' {
	import Vue from 'vue';
	export default Vue;
}

declare module 'vue/types/vue' {
	interface VueConstructor {
		tr: any,
		_: any
	}
}

declare module 'element-ui/lib/locale/lang/en' {}

// TODO: Find proper external types for these global libraries
declare function saveAs(blob: any, filename: string): void;

declare interface IJSZip {
	new (): this;
	(): IJSZip;
	prototype: IJSZip;
	folder(name: string): IJSZip;
	file(path: string, data: string, config?: {base64: boolean}): any;
	generateAsync(options: any): any;
}

declare const JSZip: IJSZip;

declare interface IjsPDF {
	new (
		orientation: 'landscape' | 'portrait',
		unit: 'pt',
		size: number[]
	): this;
	addImage(
		data: any, type: 'PNG' | 'JPEG', x: number, y: number, width: number, height: number
	): void;
	addPage(width: number, height: number): void;
	save(filename: string): void;
}

declare const jsPDF: IjsPDF;

interface jsonpatchOperation {
	op: string, path: string, value?: any;
}

declare interface Ijsonpatch {
	applyOperation<T>(
		root: T,
		action: jsonpatchOperation
	): void;
}

declare const jsonpatch: Ijsonpatch;
