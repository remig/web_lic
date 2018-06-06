'use strict';

const _ = require('./util');
const store = require('./store');
const LDParse = require('./LDParse');

const api = {

	page(page, canvas, scale = 1, selectedPart) {

		if (page.needsLayout) {
			store.mutations.page.layout({page});
		}

		const ctx = canvas.getContext('2d');
		ctx.save();
		if (scale > 1) {
			ctx.scale(scale, scale);
		}

		const template = store.state.template.page;
		ctx.fillStyle = 'white';  // Erase any previous content.  Saves having to worry about clearing the canvas before redraws.
		ctx.fillRect(0, 0, template.width, template.height);

		const rectStyle = {
			strokeStyle: template.border.color,
			lineWidth: template.border.width * 2
		};
		ctx.fillStyle = template.fill.color;
		ctx.fillRect(0, 0, template.width, template.height);

		if (template.fill.image) {
			const cachedImage = store.cache.get('page', 'backgroundImage');
			if (cachedImage) {
				ctx.drawImage(cachedImage, 0, 0);
			} else {
				const image = new Image();
				image.onload = () => {
					// TODO: this gets called multiple times on initial page load
					store.cache.set('page', 'backgroundImage', image);
					api.page(page, canvas, scale, selectedPart);
				};
				image.src = template.fill.image.src;
				return;
			}
		}

		api.roundedRectStyled(
			ctx, 0, 0, template.width, template.height,
			template.border.cornerRadius * 2, rectStyle
		);

		page.steps.forEach(id => api.step({type: 'step', id}, ctx, scale, selectedPart));

		api.dividers(page.dividers || [], ctx);

		if (page.numberLabelID != null) {
			ctx.save();
			const lbl = store.get.numberLabel(page.numberLabelID);
			ctx.fillStyle = template.numberLabel.color;
			ctx.font = template.numberLabel.font;
			ctx.textAlign = lbl.align || 'start';
			ctx.textBaseline = lbl.valign || 'alphabetic';
			ctx.fillText(page.number, lbl.x, lbl.y);
			ctx.restore();
		}

		if (page.annotations != null) {
			page.annotations.forEach(id => {
				api.annotation(store.get.annotation(id), ctx);
			});
		}
		ctx.restore();
	},

	annotation(annotation, ctx) {
		switch (annotation.annotationType) {
			case 'label': {
				ctx.fillStyle = annotation.color || 'black';
				ctx.font = annotation.font || 'bold 20pt Helvetica';
				ctx.fillText(annotation.text, annotation.x, annotation.y + annotation.height);
				break;
			}
			case 'image': {
				const cachedImage = store.cache.get(annotation, 'rawImage');
				if (cachedImage) {
					ctx.drawImage(cachedImage, Math.floor(annotation.x), Math.floor(annotation.y));
				} else {
					const image = new Image();
					image.onload = function() {
						annotation.width = this.width;
						annotation.height = this.height;
						ctx.drawImage(image, Math.floor(annotation.x), Math.floor(annotation.y));
						store.cache.set(annotation, 'rawImage', image);
					};
					image.src = annotation.src;
				}
				break;
			}
		}
	},

	// TODO: Add support for a quantity label to a step. Useful on the last step of a submodel build many times.
	step(step, ctx, scale = 1, selectedPart) {

		step = store.get.step(step);
		const localModel = LDParse.model.get.part(step.model.filename);

		ctx.save();
		ctx.translate(Math.floor(step.x), Math.floor(step.y));

		if (step.csi == null && step.steps.length) {
			step.steps.forEach(id => api.step({type: 'step', id}, ctx, scale, selectedPart));
		} else if (step.csiID != null) {
			api.csi(step.csiID, localModel, ctx, scale, selectedPart);
		}

		(step.submodelImages || []).forEach(submodelImageID => {
			api.submodelImage(submodelImageID, ctx, scale);
		});

		(step.callouts || []).forEach(calloutID => {
			api.callout(calloutID, ctx, scale, selectedPart);
		});

		if (step.pliID != null && store.state.plisVisible) {
			api.pli(step.pliID, localModel, ctx, scale);
		}

		if (step.numberLabelID != null) {
			let template = store.state.template;
			template = (step.parent.type === 'callout') ? template.callout.step : template.step;
			const lbl = store.get.numberLabel(step.numberLabelID);
			ctx.fillStyle = template.numberLabel.color;
			ctx.font = template.numberLabel.font;
			ctx.textAlign = lbl.align || 'start';
			ctx.textBaseline = lbl.valign || 'alphabetic';
			ctx.fillText(step.number + '', lbl.x, lbl.y);
		}

		if (step.rotateIconID != null) {
			api.rotateIcon(step.rotateIconID, ctx);
		}

		api.dividers(step.dividers || [], ctx);

		ctx.restore();
	},

	submodelImage(submodelImage, ctx, scale = 1) {
		submodelImage = store.get.submodelImage(submodelImage);
		const template = store.state.template.submodelImage;
		const csi = store.get.csi(submodelImage.csiID);

		const rectStyle = {
			fillStyle: template.fill.color,
			strokeStyle: template.border.color,
			lineWidth: template.border.width
		};
		api.roundedRectStyled(
			ctx, submodelImage.x, submodelImage.y,
			submodelImage.width, submodelImage.height,
			template.border.cornerRadius, rectStyle
		);

		ctx.save();
		ctx.scale(1 / scale, 1 / scale);
		const part = LDParse.model.get.part(submodelImage.modelFilename);
		const siCanvas = store.render.pli(part, csi, scale).container;
		const x = Math.floor((submodelImage.x + csi.x) * scale);
		const y = Math.floor((submodelImage.y + csi.y) * scale);
		ctx.drawImage(siCanvas, x, y);
		ctx.restore();

		if (submodelImage.quantityLabelID != null) {
			ctx.save();
			const lbl = store.get.quantityLabel(submodelImage.quantityLabelID);
			ctx.fillStyle = template.quantityLabel.color;
			ctx.font = template.quantityLabel.font;
			ctx.textAlign = lbl.align || 'start';
			ctx.textBaseline = lbl.valign || 'alphabetic';
			ctx.fillText('x' + submodelImage.quantity, lbl.x, lbl.y);
			ctx.restore();
		}
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
			const x = Math.floor((csi.x - res.dx) * scale);
			const y = Math.floor((csi.y - res.dy) * scale);
			ctx.drawImage(res.container, x, y);  // TODO: profile performance if every x, y, w, h argument is passed in
		}
		ctx.restore();
	},

	pli(pli, localModel, ctx, scale = 1) {
		const template = store.state.template;
		pli = store.get.pli(pli);

		let pliItems = pli.pliItems;
		if (!template.pli.includeSubmodels) {
			pliItems = pliItems.filter(id => {
				return !store.get.pliItemIsSubmodel({id, type: 'pliItem'});
			});
		}

		if (_.isEmpty(pliItems)) {
			return;
		}
		const rectStyle = {
			fillStyle: template.pli.fill.color,
			strokeStyle: template.pli.border.color,
			lineWidth: template.pli.border.width
		};
		api.roundedRectStyled(
			ctx, pli.x + pli.borderOffset.x, pli.y + pli.borderOffset.y,
			pli.width, pli.height,
			template.pli.border.cornerRadius, rectStyle
		);

		ctx.save();
		ctx.scale(1 / scale, 1 / scale);
		ctx.translate(Math.floor(pli.x), Math.floor(pli.y));
		pliItems.forEach(idx => {
			const pliItem = store.get.pliItem(idx);
			const part = localModel.parts[pliItem.partNumbers[0]];
			const pliCanvas = store.render.pli(part, pliItem, scale).container;
			const x = Math.floor(pliItem.x * scale);
			const y = Math.floor(pliItem.y * scale);
			ctx.drawImage(pliCanvas, x, y);
		});
		ctx.restore();

		pliItems.forEach(idx => {
			const pliItem = store.get.pliItem(idx);
			const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
			ctx.fillStyle = template.pliItem.quantityLabel.color;
			ctx.font = template.pliItem.quantityLabel.font;
			ctx.fillText(
				'x' + pliItem.quantity,
				pli.x + pliItem.x + quantityLabel.x,
				pli.y + pliItem.y + quantityLabel.y + quantityLabel.height
			);
		});
	},

	callout(callout, ctx, scale = 1, selectedPart) {
		const template = store.state.template.callout;
		callout = store.get.callout(callout);
		ctx.save();
		ctx.translate(Math.floor(callout.x), Math.floor(callout.y));

		const rectStyle = {
			fillStyle: template.fill.color,
			strokeStyle: template.border.color,
			lineWidth: template.border.width
		};
		api.roundedRectStyled(ctx, 0, 0, callout.width, callout.height, template.border.cornerRadius, rectStyle);

		callout.steps.forEach(id => api.step({type: 'step', id}, ctx, scale, selectedPart));
		ctx.restore();

		ctx.strokeStyle = template.arrow.border.color;
		ctx.fillStyle = template.arrow.border.color;
		ctx.lineWidth = template.arrow.border.width;
		(callout.calloutArrows || []).forEach(arrowID => {
			api.calloutArrow(arrowID, ctx);
		});
	},

	calloutArrow(arrow, ctx) {
		arrow = store.get.calloutArrow(arrow);
		const template = store.state.template.callout.arrow;
		const arrowPoints = store.get.calloutArrowToPoints(arrow);
		const pt = pixelOffset(arrowPoints[0], template.border.width);
		ctx.beginPath();
		ctx.moveTo(pt.x, pt.y);
		arrowPoints.slice(1, -1).forEach(pt => {
			pt = pixelOffset(pt, template.border.width);
			ctx.lineTo(pt.x, pt.y);
		});
		ctx.stroke();
		ctx.fillStyle = template.color;
		const tip = pixelOffset(_.last(arrowPoints), template.border.width);
		// TODO: consider arrow line width when drawing arrow, so it grows along with line width
		// TODO: line width 0 should not draw anything
		api.arrowHead(ctx, tip.x, tip.y, arrow.direction);
		ctx.fill();
	},

	rotateIcon(icon, ctx) {
		const template = store.state.template.rotateIcon;
		icon = store.get.rotateIcon(icon);
		const scale = {  // Icon is drawn in 100 x 94 space; scale to that
			width: icon.width / 100,  // TODO: put Layout.rotateIconAspectRatio somewhere easier to read
			height: icon.height / 94
		};

		ctx.strokeStyle = template.border.color;
		ctx.lineWidth = template.border.width;
		ctx.save();
		ctx.translate(Math.floor(icon.x), Math.floor(icon.y));
		ctx.scale(scale.width, scale.height);

		if (template.fill.color) {
			ctx.fillStyle = template.fill.color;
			api.roundedRect(ctx, 0, 0, 100, 94, 15);
			ctx.fill();
		}

		const haveBorder = _.isBorderVisible(template.border);
		if (haveBorder) {
			api.roundedRect(ctx, 0, 0, 100, 94, 15);
		}
		ctx.restore();
		if (haveBorder) {
			ctx.stroke();  // Stroke in unscaled space to ensure borders of constant width
		}

		ctx.fillStyle = ctx.strokeStyle = template.arrow.border.color;
		ctx.lineWidth = template.arrow.border.width;
		ctx.save();
		ctx.translate(Math.floor(icon.x), Math.floor(icon.y));
		ctx.scale(scale.width, scale.height);
		ctx.beginPath();
		ctx.arc(50, 38, 39, _.radians(29), _.radians(130));
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(50, 56, 39, _.radians(180 + 29), _.radians(180 + 130));
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
				ctx.rotate(_.radians(presetAngles[rotation]));
			} else if (typeof rotation === 'number') {
				ctx.rotate(_.radians(rotation));
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

	dividers(dividerList, ctx) {
		const template = store.state.template.divider.border;
		ctx.strokeStyle = template.color;
		ctx.lineWidth = template.width;
		dividerList.forEach(id => {
			const divider = store.get.divider(id);
			ctx.beginPath();
			const p1 = pixelOffset(divider.p1, template.width);
			ctx.moveTo(p1.x, p1.y);
			const p2 = pixelOffset(divider.p2, template.width);
			ctx.lineTo(p2.x, p2.y);
			ctx.stroke();
		});
	},

	highlight(canvas, x, y, w, h) {
		const ctx = canvas.getContext('2d');
		ctx.save();
		ctx.strokeStyle = '#2eb9ce';
		ctx.lineWidth = 3;
		ctx.setLineDash([5, 3]);
		ctx.strokeRect(x, y, w, h);
		ctx.restore();
	},

	roundedRectStyled(ctx, x, y, w, h, r, style) {
		ctx.save();
		if (style.fillStyle) {
			ctx.fillStyle = style.fillStyle;
			api.roundedRect(ctx, x, y, w, h, r, style.lineWidth);
			ctx.fill();
		}
		if (_.isBorderVisible({width: style.lineWidth, color: style.strokeStyle})) {
			ctx.strokeStyle = style.strokeStyle;
			ctx.lineWidth = style.lineWidth;
			api.roundedRect(ctx, x, y, w, h, r, style.lineWidth);
			ctx.stroke();
		}
		ctx.restore();
	},

	roundedRect(ctx, x, y, w, h, r, lineWidth) {
		// TODO: this looks bad if border line width is thick; make 'r' define inner curve, not the middle of the curve
		w = Math.floor(w);
		h = Math.floor(h);
		({x, y} = pixelOffset({x, y}, lineWidth));
		ctx.beginPath();
		ctx.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
		ctx.arc(x + w - r, y + r, r, 3 * Math.PI / 2, 0);
		ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
		ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
		ctx.closePath();
	}
};

function pixelOffset({x, y}, lineWidth) {
	x = Math.floor(x);
	y = Math.floor(y);
	if (lineWidth % 2) {  // Avoid half-pixel offset blurry lines
		x += 0.5;
		y += 0.5;
	}
	return {x, y};
}

module.exports = api;
