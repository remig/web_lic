import Vue from 'vue';
import ElementUI from 'element-ui';
import locale from 'element-ui/lib/locale/lang/en';
import UI from './ui.vue';

Vue.use(ElementUI, {locale});

Vue.config.performance = false;

new Vue({
	render: h => h(UI)
}).$mount('#app');
