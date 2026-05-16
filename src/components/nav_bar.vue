/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<nav class="navbar navbar-default">
		<ul class="nav navbar-nav">
			<li v-for="menu in menuEntryList" :id="menu.id" :key="menu.id" class="dropdown">
				<a
					class="dropdown-toggle"
					data-toggle="dropdown"
					role="button"
					aria-haspopup="true"
					aria-expanded="false"
					@click.prevent.stop="triggerMenu($event)"
				>
					{{ t(menu.text) }}
					<span class="caret" />
				</a>
				<popup-menu :menu-entries="menu.children" selected-item="" />
			</li>
		</ul>
		<ul class="nav navbar-nav navbar-right">
			<template v-if="filename && filename.name">
				<li>
					<span id="filename" class="navbar-text">
						{{ filename.name + (filename.isDirty ? ' *' : '') }}
					</span>
				</li>
				<li>
					<span class="navbar-text"> | </span>
				</li>
			</template>
			<li>
				<a class="clickable" @click.prevent.stop="showAboutLicDialog"> Web Lic {{ version }} </a>
			</li>
		</ul>
	</nav>
</template>

<script setup lang="ts">
import { t } from '@/translations';
import { getCurrentInstance, onMounted, onUnmounted } from 'vue';

import packageInfo from '../../package.json';
import { showAboutLicDialog } from '../dialog';
import EventBus from '../event_bus';
import _ from '../util';
import PopupMenu from './popup_menu.vue';

defineProps<{
	menuEntryList: any[];
	filename: { name: string; isDirty: boolean } | null | undefined;
}>();
const emit = defineEmits<{ (e: 'close-menus'): void }>();

const instance = getCurrentInstance();
const version = _.version.nice(packageInfo.version);

function forceUpdate() {
	instance?.proxy?.$forceUpdate();
	(instance?.proxy as any)?.$children?.forEach((el: any) => el.forceUpdate?.());
}

function hide() {
	document.querySelectorAll('.dropdown.open').forEach((el) => {
		el.classList.remove('open');
	});
}

function triggerMenu(e: MouseEvent) {
	emit('close-menus');
	(e.target as HTMLElement).parentElement?.classList.add('open');
}

onMounted(() => {
	EventBus.on('hide-menus', hide);
	EventBus.on('force-update', forceUpdate);
});

onUnmounted(() => {
	EventBus.off('hide-menus', hide);
	EventBus.off('force-update', forceUpdate);
});

defineExpose({ forceUpdate, hide });
</script>
