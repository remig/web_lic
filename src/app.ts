import Vue from 'vue';
import './styles/global.css';

import UI from './ui.vue';
Vue.config.performance = false;

const app = new Vue({
	render: h => {
		return h(UI, {ref: 'app'});
	},
}).$mount('#app');

declare global {
	interface Window {__lic: any;}
}

window.__lic.app = app.$refs.app;
