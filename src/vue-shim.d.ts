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

declare function saveAs(blob: any, filename: string): void;

declare interface JSZip {
	new (): this;
	(): JSZip;
	prototype: JSZip;
	folder(name: string): JSZip;
	file(path: string, data: string): any;
	generateAsync(options: any): any;
}

declare const JSZip: JSZip;
