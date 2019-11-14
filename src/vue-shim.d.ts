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

declare module 'element-ui/lib/locale/lang/en' {
}

declare function saveAs(blob: any, filename: string): void;
