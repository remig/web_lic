import Vue from 'vue';
import './styles/global.css';

import UI from './ui.vue';
import _ from './util';
import {tr} from './translations';

Vue.config.performance = false;

Vue.use({
	install(vue) {
		vue.prototype.tr = tr;
		vue.prototype._ = _;
	},
});

const app = new Vue({
	render: h => {
		return h(UI, {ref: 'app'});
	},
}).$mount('#app');

declare global {
	interface Window {__lic: any;}
}

window.__lic.app = app.$refs.app;
