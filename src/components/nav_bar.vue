/* Web Lic - Copyright (C) 2019 Remi Gagne */

<template>
	<nav class="navbar navbar-default">
		<ul class="nav navbar-nav">
			<li
				v-for="menu in menuEntryList"
				:id="menu.id"
				:key="menu.id"
				class="dropdown"
			>
				<a
					class="dropdown-toggle"
					data-toggle="dropdown"
					role="button"
					aria-haspopup="true"
					aria-expanded="false"
					@click.prevent.stop="triggerMenu($event)"
				>
					{{tr(menu.text)}}
					<span class="caret" />
				</a>
				<popup-menu :menu-entries="menu.children" selected-item="" />
			</li>
		</ul>
		<ul class="nav navbar-nav navbar-right">
			<template v-if="filename && filename.name">
				<li>
					<span id="filename" class="navbar-text">
						{{filename.name + (filename.isDirty ? ' *' : '')}}
					</span>
				</li>
				<li>
					<span class="navbar-text">
						|
					</span>
				</li>
			</template>
			<li>
				<a
					class="clickable"
					@click.prevent.stop="showAbout"
				>
					Web Lic {{version}}
				</a>
			</li>
		</ul>
	</nav>
</template>

<script>

import _ from '../util';
import packageInfo from '../../package.json';
import DialogManager from '../dialog';
import PopupMenu from './popup_menu.vue';

export default {
	components: {PopupMenu},
	props: ['menuEntryList', 'filename'],
	methods: {
		forceUpdate() {
			this.$forceUpdate();
			this.$children.forEach(el => el.forceUpdate());
		},
		showAbout() {
			DialogManager('aboutLicDialog');
		},
		hide() {
			document.querySelectorAll('.dropdown.open').forEach(el => {
				el.classList.remove('open');
			});
		},
		triggerMenu(e) {
			this.$emit('close-menus');
			e.target.parentElement.classList.add('open');
		}
	},
	computed: {
		version() {
			return _.version.nice(packageInfo.version);  // major.minor is enough for public consumption
		}
	}
};

</script>
