import Vue from 'vue'

declare module 'vue/types/vue' {
	interface VueConstructor<Vue> {
		tr: any,
		_: any
	}
}
