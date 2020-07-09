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
					{{tr(resolveProperty(entry.text))}}
				</span>
				<span
					v-if="entry.shortcut"
					class="menu-text shortcut small"
				>
					{{tr(entry.shortcut)}}
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

<script>

import Vue from 'vue';
import _ from '../util';

function hideSubMenus() {
	document.querySelectorAll('.dropdown-submenu.open').forEach(el => {
		el.classList.remove('open');
	});
}

// TODO: Add checkbox to 'selected' menu entries, like the currently selected view entry
export default {
	name: 'PopupMenu',
	// TODO: selectedItem = '' means ignore selectedItem entirely, which is ugly as hell
	props: ['menuEntries', 'selectedItem'],
	methods: {
		forceUpdate() {
			this.$forceUpdate();
			this.$children.forEach(el => el.forceUpdate());
		},
		resolveProperty(p) {
			return (typeof p === 'function') ? p(this.selectedItem) : p;
		},
		triggerMenu(entry, e) {
			if (entry.children) {
				this.toggleSubMenu(e);
			} else {
				entry.cb(this.selectedItem);
			}
		},
		toggleSubMenu(e) {

			e.preventDefault();
			e.stopPropagation();
			hideSubMenus();
			const target = e.target.parentElement;
			target.classList.add('open');

			// If submenu can't fit on the right, show it on the left
			const menuBox = target.getBoundingClientRect();
			const submenu = target.querySelector('ul');
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
				submenu.style['margin-top'] = dy + 'px';
			} else {
				submenu.style.removeProperty('margin-top');
			}
		},
		show(e) {
			const menu = document.getElementById('contextMenu');
			menu.style['outline-style'] = 'none';
			menu.style.display = 'block';
			menu.focus();
			Vue.nextTick(() => this.position(e));
		},
		position(e) {
			const menu = document.getElementById('contextMenu');
			const doc = document.documentElement;
			menu.style.left = Math.min(e.pageX, doc.clientWidth - menu.clientWidth - 10) + 'px';
			menu.style.top = Math.min(e.pageY, doc.clientHeight - menu.clientHeight - 10) + 'px';
		},
		hide() {
			hideSubMenus();
			document.getElementById('contextMenu').style.display = 'none';
		},
		entryClasses(entry) {
			return {
				divider: entry.text === 'separator',
				'dropdown-submenu': entry.children,
				disabled: entry.enabled && this.selectedItem != null
					? !entry.enabled(this.selectedItem)
					: false,
			};
		},
		visibleMenuEntries() {
			return (this.menuEntries || []).filter(entry => {
				if (this.selectedItem == null) {
					return false;
				} else if (entry.selectedItem && entry.selectedItem.type !== this.selectedItem.type) {
					return false;
				} else if (entry.shown) {
					return entry.shown(this.selectedItem);
				} else if (entry.children) {
					if (typeof entry.children === 'function') {
						return !_.isEmpty(entry.children(this.selectedItem));
					}
					return entry.children.some(el => el.shown ? el.shown(this.selectedItem) : true);
				}
				return true;
			});
		},
	},
};

</script>
