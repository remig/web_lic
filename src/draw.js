'use strict';

const util = require('./util');
const store = require('./store');
const LDParse = require('./LDParse');

const api = {

	page(page, canvas, scale = 1, selectedPart) {

		if (page.needsLayout) {
			store.mutations.page.layout({page});
		}

		const pageSize = store.state.pageSize;
		const ctx = canvas.getContext('2d');
		ctx.save();
		if (scale > 1) {
			ctx.scale(scale, scale);
		}
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, pageSize.width, pageSize.height);

		page.steps.forEach(id => api.step({type: 'step', id}, ctx, scale, selectedPart));

		(page.dividers || []).forEach(id => {
			const divider = store.get.divider(id);
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(divider.p1.x, divider.p1.y);
			ctx.lineTo(divider.p2.x, divider.p2.y);
			ctx.stroke();
		});

		if (page.numberLabel != null) {
			ctx.save();
			const lbl = store.get.pageNumber(page.numberLabel);
			ctx.fillStyle = 'black';
			ctx.font = 'bold 20pt Helvetica';
			ctx.textAlign = lbl.align || 'start';
			ctx.textBaseline = lbl.valign || 'alphabetic';
			ctx.fillText(page.number, lbl.x, lbl.y);
			ctx.restore();
		}

		if (page.annotations != null) {
			page.annotations.forEach(id => {
				const annotation = store.get.annotation(id);
				switch (annotation.annotationType) {
					case 'label':
						ctx.fillStyle = annotation.color || 'black';
						ctx.font = annotation.font || 'bold 20pt Helvetica';
						ctx.fillText(annotation.text, annotation.x, annotation.y + annotation.height);
						break;
				}
			});
		}
		ctx.restore();
	},

	step(step, ctx, scale = 1, selectedPart) {

		step = store.get.step(step);
		const localModel = LDParse.model.get.submodelDescendant(store.model, step.submodel);

		ctx.save();
		ctx.translate(step.x, step.y);

		if (step.csiID != null) {
			api.csi(step.csiID, localModel, ctx, scale, selectedPart);
		}

		(step.callouts || []).forEach(calloutID => {
			api.callout(calloutID, ctx, scale, selectedPart);
		});

		if (step.pliID != null && store.state.plisVisible) {
			api.pli(step.pliID, localModel, ctx, scale);
		}

		if (step.numberLabel != null) {
			const lbl = store.get.stepNumber(step.numberLabel);
			ctx.fillStyle = 'black';
			ctx.font = 'bold 20pt Helvetica';
			ctx.fillText(step.number + '', lbl.x, lbl.y + lbl.height);
		}

		if (step.rotateIconID != null) {
			api.rotateIcon(step.rotateIconID, ctx);
		}

		ctx.restore();
	},

	csi(csi, localModel, ctx, scale = 1, selectedPart) {
		csi = store.get.csi(csi);
		const step = store.get.parent(csi);

		ctx.save();
		ctx.scale(1 / scale, 1 / scale);
		const haveSelectedParts = selectedPart && selectedPart.stepID === step.id;
		const selectedPartIDs = haveSelectedParts ? [selectedPart.id] : null;
		const renderer = selectedPartIDs == null ? 'csi' : 'csiWithSelection';
		const res = store.render[renderer](localModel, step, csi, selectedPartIDs, scale);
		if (res) {
			ctx.drawImage(res.container, (csi.x - res.dx) * scale, (csi.y - res.dy) * scale);  // TODO: profile performance if every x, y, w, h argument is passed in
		}
		ctx.restore();
	},

	pli(pli, localModel, ctx, scale = 1) {
		pli = store.get.pli(pli);
		if (util.isEmpty(pli.pliItems)) {
			return;
		}
		ctx.strokeStyle = 'black';
		ctx.lineWidth = 2;
		api.roundedRect(ctx, pli.x, pli.y, pli.width, pli.height, 10);
		ctx.stroke();

		ctx.save();
		ctx.scale(1 / scale, 1 / scale);
		pli.pliItems.forEach(idx => {
			const pliItem = store.get.pliItem(idx);
			const part = localModel.parts[pliItem.partNumbers[0]];
			const pliCanvas = store.render.pli(part, scale).container;
			ctx.drawImage(pliCanvas, (pli.x + pliItem.x) * scale, (pli.y + pliItem.y) * scale);
		});
		ctx.restore();

		pli.pliItems.forEach(idx => {
			const pliItem = store.get.pliItem(idx);
			const pliQty = store.get.pliQty(pliItem.pliQtyID);
			ctx.fillStyle = 'black';
			ctx.font = 'bold 10pt Helvetica';
			ctx.fillText(
				'x' + pliItem.quantity,
				pli.x + pliItem.x + pliQty.x,
				pli.y + pliItem.y + pliQty.y + pliQty.height
			);
		});
	},

	callout(callout, ctx, scale = 1, selectedPart) {
		callout = store.get.callout(callout);
		ctx.save();
		ctx.translate(callout.x, callout.y);

		callout.steps.forEach(id => api.step({type: 'step', id}, ctx, scale, selectedPart));

		ctx.strokeStyle = 'black';
		ctx.lineWidth = 2;
		api.roundedRect(ctx, 0, 0, callout.width, callout.height, 10);
		ctx.stroke();
		(callout.calloutArrows || []).forEach(arrowID => {
			const arrow = store.get.calloutArrow(arrowID);
			const arrowPoints = store.get.calloutArrowToPoints(arrow);
			ctx.beginPath();
			ctx.moveTo(arrowPoints[0].x, arrowPoints[0].y);
			arrowPoints.slice(1, -1).forEach(pt => {
				ctx.lineTo(pt.x, pt.y);
			});
			ctx.stroke();
			ctx.fillStyle = 'black';
			const tip = arrowPoints[arrowPoints.length - 1];
			api.arrowHead(ctx, tip.x, tip.y, arrow.direction);
			ctx.fill();
		});
		ctx.restore();
	},

	rotateIcon(icon, ctx) {
		icon = store.get.rotateIcon(icon);
		const scale = {  // Icon is drawn in 100 x 94 space; scale to that
			width: icon.width / 100,  // TODO: put Layout.rotateIconAspectRatio somewhere easier to read
			height: icon.height / 94
		};

		ctx.fillStyle = ctx.strokeStyle = 'black';
		ctx.lineWidth = 2;
		ctx.save();
		ctx.translate(icon.x, icon.y);
		ctx.scale(scale.width, scale.height);
		api.roundedRect(ctx, 0, 0, 100, 94, 15);
		ctx.restore();
		ctx.stroke();  // Stroke in unscaled space to ensure borders of constant width

		ctx.lineWidth = 3;
		ctx.save();
		ctx.translate(icon.x, icon.y);
		ctx.scale(scale.width, scale.height);
		ctx.beginPath();
		ctx.arc(50, 38, 39, util.radians(29), util.radians(130));
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(50, 56, 39, util.radians(180 + 29), util.radians(180 + 130));
		ctx.stroke();

		api.arrowHead(ctx, 15, 57, 135, [1, 0.7]);
		ctx.fill();
		api.arrowHead(ctx, 86, 38, -45, [1, 0.7]);
		ctx.fill();
		ctx.restore();
	},

	arrowHead: (() => {

		const presetAngles = {up: 180, left: 90, right: -90};
		const arrowDimensions = {
			head: {
				length: 30,
				width: 7,
				insetDepth: 3
			},
			body: {
				width: 1.25
			}
		};

		return function(ctx, tipX, tipY, rotation, scale) {
			const head = arrowDimensions.head, bodyWidth = 1.25;
			ctx.save();
			ctx.translate(tipX, tipY);
			if (rotation in presetAngles) {
				ctx.rotate(util.radians(presetAngles[rotation]));
			} else if (typeof rotation === 'number') {
				ctx.rotate(util.radians(rotation));
			}
			if (scale) {
				if (Array.isArray(scale)) {
					ctx.scale(scale[0], scale[1]);
				} else {
					ctx.scale(scale, scale);
				}
			}
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.lineTo(-head.width, -head.length);
			ctx.lineTo(-bodyWidth, -head.length + head.insetDepth);
			ctx.lineTo(bodyWidth, -head.length + head.insetDepth);
			ctx.lineTo(head.width, -head.length);
			ctx.closePath();
			ctx.restore();
		};
	})(),

	roundedRect(ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
		ctx.arc(x + w - r, y + r, r, 3 * Math.PI / 2, 0);
		ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
		ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
		ctx.closePath();
	}

};

module.exports = api;
