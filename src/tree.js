/* global module: false, $: false, Vue: false, app: false, util: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
tree = (function() {
'use strict';

// TODO: page down to a new page then click CSI: must expand that page in the tree to show selected CSI

Vue.component('treeRowItem', {
	props: ['currentItem', 'target'],
	methods: {
		itemClick() {
			app.setSelected(this.target);
		}
	},
	computed: {
		text() {
			var t = this.target;
			if (!t) {
				return '';
			} else if (t.type === 'page') {
				return t.number == null ? 'Title Page' : 'Page ' + t.number;
			} else if (t.type === 'step') {
				return 'Step ' + (t.number || '');
			} else if (t.type === 'pliItem') {
				var part = LDParse.partDictionary[t.filename];
				if (!part || !part.name) {
					return 'Unknown Part';
				} if (part.isSubModel) {
					return part.name.replace(/\.(mpd|ldr)/ig, '');
				}
				var partName = part.name.replace(' x ', 'x');
				var partColor = LDParse.colorTable[t.colorCode].name.replace('_', ' ');
				return partName + ' - ' + partColor;
			}
			return util.titleCase(t.type);
		}
	},
	template: `
		<span
			:class="['clickable', 'treeText', {selected: target === currentItem}]"
			@click.stop.prevent="itemClick"
		>{{text}}</span>
	`
});

Vue.component('treeParentRowItem', {
	props: ['currentItem', 'target'],
	methods: {
		arrowClick(target) {
			$(this.$el.firstElementChild).toggleClass('treeIconOpen');
			$('#' + target.type + 'ListItem' + target.id).toggleClass('hidden');
		}
	},
	template: `
		<div>
			<i class="treeIcon" @click.stop.prevent="arrowClick(target)" />
			<treeRowItem :currentItem="currentItem" :target="target" />
		</div>
	`
});

var tree = Vue.component('tree', {
	props: ['store', 'currentItem'],
	template: `
	<ul>
		<li v-for="page in store.state.pages">
			<treeParentRowItem :currentItem="currentItem" :target="page" />
			<ul :id="'pageListItem' + page.id" class="indent hidden">
				<li v-if="page.numberLabel">
					<treeRowItem :currentItem="currentItem" :target="page.numberLabel" />
				</li>
				<li class="unindent" v-for="step in page.steps.map(s => store.state.steps[s])">
					<treeParentRowItem :currentItem="currentItem" :target="step" />
					<ul :id="'stepListItem' + step.id" class="indent hidden">
						<li v-if="step.csiID != null">
							<treeRowItem :currentItem="currentItem" :target="store.state.csis[step.csiID]" />
						</li>
						<li class="unindent" v-if="step.pliID != null">
							<treeParentRowItem :currentItem="currentItem" :target="store.state.plis[step.pliID]" />
							<ul :id="'pliListItem' + step.pliID" class="indent hidden">
								<li v-for="pliItemID in store.state.plis[step.pliID].pliItems">
									<treeRowItem :currentItem="currentItem" :target="store.state.pliItems[pliItemID]" />
								</li>
							</ul>
						</li>
						<li v-if="step.numberLabel">
							<treeRowItem :currentItem="currentItem" :target="step.numberLabel" />
						</li>
					</ul>
				</li>
			</ul>
		</li>
	</ul>
	`
});

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = tree;
}

return tree;

})();
