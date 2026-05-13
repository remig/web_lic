/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<ul class="dropdown-menu">
		<li
			v-for="entry in visibleMenuEntries()"
			:id="entry.id"
			:key="entry.id"
			:class="entryClasses(entry)"
		>
			<a
				v-if="entry.text !== 'separator'"
				:class="['clickable', {'shortcut-parent': entry.shortcut}]"
				data-toggle="dropdown"
				@click="triggerMenu(entry, $event)"
			>
				<span
					class="menu-text"
				>
					{{t(resolveProperty(entry.text))}}
				</span>
				<span
					v-if="entry.shortcut"
					class="menu-text shortcut small"
				>
					{{t(entry.shortcut)}}
				</span>
			</a>
			<popup-menu
				v-if="entry.children"
				:menu-entries="resolveProperty(entry.children)"
				:selected-item="selectedItem"
			/>
		</li>
	</ul>
</template>

<script lang="ts">
// TODO: Add checkbox to 'selected' menu entries, like the currently selected view entry
// TODO: selectedItem = '' means ignore selectedItem entirely, which is ugly as hell
export default {name: 'PopupMenu'};
</script>

<script setup lang="ts">

import {nextTick, getCurrentInstance, onMounted, onUnmounted} from 'vue';
import {t} from '@/translations';
import _ from '../util';
import EventBus from '@/event_bus';

const props = defineProps<{menuEntries?: any[] | null; selectedItem: any}>();

const instance = getCurrentInstance();

function hideSubMenus() {
	document.querySelectorAll('.dropdown-submenu.open').forEach(el => {
		el.classList.remove('open');
	});
}

function forceUpdate() {
	instance?.proxy?.$forceUpdate();
	(instance?.proxy as any)?.$children?.forEach((el: any) => el.$forceUpdate?.());
}

function resolveProperty(p: any) {
	return (typeof p === 'function') ? p(props.selectedItem) : p;
}

function toggleSubMenu(e: MouseEvent) {
	e.preventDefault();
	e.stopPropagation();
	hideSubMenus();
	const target = (e.target as HTMLElement).parentElement!;
	target.classList.add('open');

	// If submenu can't fit on the right, show it on the left
	const menuBox = target.getBoundingClientRect();
	const submenu = target.querySelector('ul') as HTMLElement;
	const submenuRightEdge = menuBox.x + menuBox.width + submenu.clientWidth;
	if (submenuRightEdge > document.documentElement.clientWidth - 20) {
		submenu.style.left = 'unset';
		submenu.style.right = '100%';
	} else {
		submenu.style.left = '100%';
		submenu.style.right = 'unset';
	}
	const submenuBottomEdge = menuBox.y + submenu.clientHeight;
	if (submenuBottomEdge > document.documentElement.clientHeight - 20) {
		const dy = document.documentElement.clientHeight - submenuBottomEdge - 10;
		submenu.style.marginTop = dy + 'px';
	} else {
		submenu.style.removeProperty('margin-top');
	}
}

function triggerMenu(entry: any, e: MouseEvent) {
	if (entry.children) {
		toggleSubMenu(e);
	} else {
		entry.cb(props.selectedItem);
	}
}

function position(e: MouseEvent) {
	const menu = document.getElementById('contextMenu')!;
	const doc = document.documentElement;
	menu.style.left = Math.min(e.pageX, doc.clientWidth - menu.clientWidth - 10) + 'px';
	menu.style.top = Math.min(e.pageY, doc.clientHeight - menu.clientHeight - 10) + 'px';
}

function show({e}: {e: MouseEvent}) {
	const menu = document.getElementById('contextMenu')!;
	menu.style.outlineStyle = 'none';
	menu.style.display = 'block';
	menu.focus();
	nextTick(() => position(e));
}

function hide() {
	hideSubMenus();
	document.getElementById('contextMenu')!.style.display = 'none';
}

function entryClasses(entry: any) {
	return {
		divider: entry.text === 'separator',
		'dropdown-submenu': entry.children,
		disabled: entry.enabled && props.selectedItem != null
			? !entry.enabled(props.selectedItem)
			: false,
	};
}

function visibleMenuEntries() {
	return (props.menuEntries || []).filter(entry => {
		if (props.selectedItem == null) {
			return false;
		} else if (entry.selectedItem && entry.selectedItem.type !== props.selectedItem.type) {
			return false;
		} else if (entry.shown) {
			return entry.shown(props.selectedItem);
		} else if (entry.children) {
			if (typeof entry.children === 'function') {
				return !_.isEmpty(entry.children(props.selectedItem));
			}
			return entry.children.some((el: any) => el.shown ? el.shown(props.selectedItem) : true);
		}
		return true;
	});
}

onMounted(() => {
	EventBus.on('show-menu', show);
	EventBus.on('hide-menus', hide);
	EventBus.on('force-update', forceUpdate);
});

onUnmounted(() => {
	EventBus.off('show-menu', show);
	EventBus.off('hide-menus', hide);
	EventBus.off('force-update', forceUpdate);
});

defineExpose({show, hide, forceUpdate});

</script>
