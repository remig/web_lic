/* global Vue: false, ELEMENT: false */
import UI from './ui.vue';
import _ from './util';
import LocaleManager from './components/translate.vue';

ELEMENT.locale(ELEMENT.lang.en);

Vue.config.performance = false;

Vue.use({
	install(Vue) {
		// Add a 'tr' method to every component, which makes translating strings in template HTML easier
		Vue.prototype.tr = LocaleManager.translate;
		Vue.prototype._ = _;
	}
});

new Vue({
	render: h => h(UI)
}).$mount('#app');
