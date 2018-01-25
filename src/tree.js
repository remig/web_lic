/* global module: false, $: false, Vue: false, app: false, util: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
tree = (function() {
'use strict';

Vue.component('treeRowItem', {
	props: ['currentItem', 'target'],
	methods: {
		itemClick() {
			app.setSelected(this.target);
		}
	},
	watch: {
		currentItem: function(newItem) {
			if (newItem === this.target) {
				let el = this.$el.parentElement;
				while (el) {
					if (el.nodeName === 'UL') {
						$(el).removeClass('hidden').prev().children().first().removeClass('treeIconClosed');
					}
					el = el.parentElement;
				}
			}
		}
	},
	computed: {
		text() {
			const t = this.target;
			if (!t) {
				return '';
			} else if (t.type === 'page') {
				return t.number == null ? 'Title Page' : 'Page ' + t.number;
			} else if (t.type === 'step') {
				return 'Step ' + (t.number || '');
			} else if (t.type === 'label') {
				return t.text;
			} else if (t.type === 'pliItem') {
				const part = LDParse.partDictionary[t.filename];
				if (!part || !part.name) {
					return 'Unknown Part';
				} else if (part.isSubModel) {
					return part.name.replace(/\.(mpd|ldr)/ig, '');
				}
				const partName = part.name.replace(' x ', 'x');
				const partColor = LDParse.colorTable[t.colorCode].name.replace('_', ' ');
				return partName + ' - ' + partColor;
			}
			return util.titleCase(t.type);
		}
	},
	template: `
		<span
			:class="['clickable', 'treeText', {
				selected: target && currentItem && target.id === currentItem.id && target.type === currentItem.type
			}]"
			@click.stop.prevent="itemClick"
		>{{text}}</span>
	`
});

Vue.component('treeParentRowItem', {
	props: ['currentItem', 'target'],
	methods: {
		arrowClick(target) {
			$(this.$el.firstElementChild).toggleClass('treeIconClosed');
			$('#' + target.type + 'ListItem' + target.id).toggleClass('hidden');
		}
	},
	template: `
		<div>
			<i class="treeIcon treeIconClosed" @click.stop.prevent="arrowClick(target)" />
			<treeRowItem :currentItem="currentItem" :target="target" />
		</div>
	`
});

var tree = Vue.component('tree', {
	props: ['treeData', 'currentItem'],
	template: `
	<ul>
		<li v-for="page in treeData.store.state.pages">
			<treeParentRowItem :currentItem="currentItem" :target="page" />
			<ul :id="'pageListItem' + page.id" class="indent hidden">
				<li v-if="page.numberLabel != null">
					<treeRowItem :currentItem="currentItem" :target="treeData.store.get.pageNumber(page.numberLabel)" />
				</li>
				<li v-if="page.labels != null" v-for="labelID in page.labels">
					<treeRowItem :currentItem="currentItem" :target="treeData.store.get.label(labelID)" />
				</li>
				<li class="unindent" v-for="step in page.steps.map(stepID => treeData.store.get.step(stepID))">
					<treeParentRowItem :currentItem="currentItem" :target="step" />
					<ul :id="'stepListItem' + step.id" class="indent hidden">
						<li v-if="step.csiID != null">
							<treeRowItem :currentItem="currentItem" :target="treeData.store.get.csi(step.csiID)" />
						</li>
						<li class="unindent" v-if="step.pliID != null">
							<treeParentRowItem :currentItem="currentItem" :target="treeData.store.get.pli(step.pliID)" />
							<ul :id="'pliListItem' + step.pliID" class="indent hidden">
								<li v-for="pliItemID in treeData.store.get.pli(step.pliID).pliItems">
									<treeRowItem :currentItem="currentItem" :target="treeData.store.get.pliItem(pliItemID)" />
								</li>
							</ul>
						</li>
						<li v-if="step.numberLabel != null">
							<treeRowItem :currentItem="currentItem" :target="treeData.store.get.stepNumber(step.numberLabel)" />
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
