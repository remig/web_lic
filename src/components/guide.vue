/* Web Lic - Copyright (C) 2018 Remi Gagne */

<script>

import _ from '../util';
import undoStack from '../undo_stack';
import uiState from '../ui_state';

export default {

	name: 'Guide',
	props: ['position', 'orientation', 'pageSize', 'id'],
	data() {
		return {
			originalPosition: this.position
		};
	},
	render(createElement) {

		// TODO: Make guides bigger so they're easier to drag around
		const isVertical = (this.orientation === 'vertical');

		const style = {};
		if (isVertical) {
			style.left = this.position + 'px';
			style.height = this.pageSize.height + 20 + 'px';
		} else {
			style.top = this.position + 'px';
			style.width = this.pageSize.width + 20 + 'px';
		}
		return createElement(
			'div',
			{
				attrs: {'data-id': `guide-${this.id}`},
				'class': ['guide', isVertical ? 'guide-vertical' : 'guide-horizontal'],
				style
			}
		);
	},
	methods: {
		moveBy(dx, dy) {
			// TOOD: Improve performance here to cut down guide drag flicker
			if (this.orientation === 'vertical') {
				let left = parseFloat(this.$el.style.left) + dx;
				left = _.clamp(left, 0, this.pageSize.width) + 'px';
				document.querySelectorAll(`[data-id="guide-${this.id}"]`).forEach(el => {
					el.style.left = left;
				});
			} else {
				let top = parseFloat(this.$el.style.top) + dy;
				top = _.clamp(top, 0, this.pageSize.height) + 'px';
				document.querySelectorAll(`[data-id="guide-${this.id}"]`).forEach(el => {
					el.style.top = top;
				});
			}
		},
		savePosition() {
			const attr = (this.orientation === 'vertical') ? 'left' : 'top';
			const position = parseFloat(this.$el.style[attr]);
			this.originalPosition = position;
			const change = uiState.mutations.guides.setPosition(this.id, position);
			undoStack.commit(change, null, 'Move Guide');
		}
	}
};
</script>

<style>

.guide {
	position: absolute;
}

.guide-vertical {
	border-right: 1px solid black;
	top: -10px;
	width: 1px;
	cursor: e-resize;
}

.guide-horizontal {
	border-top: 1px solid black;
	left: -10px;
	height: 1px;
	cursor: n-resize;
}

</style>
