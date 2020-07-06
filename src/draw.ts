/* Web Lic - Copyright (C) 2018 Remi Gagne */

import _ from './util';
import store from './store';
import cache from './cache';
import LDParse from './ld_parse';
import uiState from './ui_state';
import {isSize, isPoint, isPointItem} from './type_helpers';

interface DrawConfig {
	hiResScale?: number;
	selectedItem?: LookupItem | null;
	noCache?: boolean;
	noGrid?: boolean;
}

interface StyleInterface {
	fillStyle?: string | null;
	lineWidth: number;
	strokeStyle: string | null;
}

export interface DrawInterface {
	page(page: Page, canvas: HTMLCanvasElement, config?: DrawConfig): void;
}

const drawArrowHead = (() => {

	const presetAngles = {up: 180, left: 90, right: -90, down: 0};
	const arrowDimensions = _.geom.arrow();

	return function(
		ctx: CanvasRenderingContext2D,
		baseX: number, baseY: number, rotation?: number | Directions | null, scale?: number | number[]
	) {
		const head = arrowDimensions.head, bodyWidth = 1.25;
		ctx.save();
		ctx.translate(baseX, baseY);
		if (typeof rotation === 'number') {
			ctx.rotate(_.radians(rotation));
		} else if (rotation && (rotation in presetAngles)) {
			ctx.rotate(_.radians(presetAngles[rotation]));
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
		ctx.lineTo(bodyWidth, 0);
		ctx.lineTo(head.width, -head.insetDepth);
		ctx.lineTo(0, head.length - head.insetDepth);
		ctx.lineTo(-head.width, -head.insetDepth);
		ctx.lineTo(-bodyWidth, 0);
		ctx.closePath();
		ctx.restore();
	};
})();

const drawAnnotation = (() => {

	function transformPoint(pt: Point | PointItem, annotation: Annotation, borderWidth: number) {
		if (!isPointItem(pt)) {
			return pixelOffset(pt, borderWidth);
		}
		// We're in an arbitrarily transformed coordinate space, defined by annotation's parent.
		// relativeTo is either before or after parent in the transform stack.
		// We need to transform back / forward to pt's relativeTo coordinate space.
		let {x, y} = pt;
		let relativeTo = store.get.lookupToItem(pt.relativeTo);
		let parent = store.get.parent(annotation);
		if (parent === relativeTo) {
			return pixelOffset(pt, borderWidth);
		}
		// Start from relativeTo and walk the transform backward; if we hit parent, return that transform
		while (relativeTo) {
			if (isPoint(relativeTo)) {
				x += relativeTo.x;
				y += relativeTo.y;
			}
			relativeTo = store.get.parent(relativeTo);
			if (parent === relativeTo) {
				return pixelOffset({x, y}, borderWidth);
			}
		}
		// Haven't found target, and we've transformed to the page, so start from the parent
		// and walk the transform forward until we hit the page
		while (parent) {
			if (isPoint(parent)) {
				x -= parent.x;
				y -= parent.y;
			}
			parent = store.get.parent(parent);
		}
		return pixelOffset({x, y}, borderWidth);
	}

	const drawLookup = {

		label(annotation: Annotation, ctx: CanvasRenderingContext2D) {
			const x = Math.floor(annotation.x);
			const y = Math.floor(annotation.y);
			ctx.fillStyle = annotation.color || 'black';
			ctx.font = annotation.font || 'bold 20pt Helvetica';
			ctx.textAlign = annotation.align || 'left';
			ctx.textBaseline = annotation.valign || 'alphabetic';
			ctx.fillText(annotation.text, x, y);
		},

		arrow(annotation: Annotation, ctx: CanvasRenderingContext2D, points?: Point[]) {
			const border = annotation.border || {color: 'black', width: 1};
			ctx.strokeStyle = border.color || 'black';
			ctx.fillStyle = border.color || 'black';
			ctx.lineWidth = border.width;
			ctx.beginPath();
			const pointList = points || annotation.points;
			pointList.forEach((pointId: number | Point, idx: number) => {
				const pointItem = (typeof pointId === 'number')
					? store.get.point(pointId)
					: pointId;
				if (pointItem) {
					const pt = transformPoint(pointItem, annotation, border.width);
					ctx[(idx === 0) ? 'moveTo' : 'lineTo'](pt.x, pt.y);
				}
			});
			ctx.stroke();
			const lastPt = _.last<Point | number>(pointList);
			const lastPtItem = (typeof lastPt === 'number')
				? store.get.point(lastPt)
				: lastPt;
			if (lastPtItem) {
				const tip = transformPoint(lastPtItem, annotation, border.width);
				drawArrowHead(ctx, tip.x, tip.y, annotation.direction);
				ctx.fill();
			}
		},

		stairStepArrow(annotation: Annotation, ctx: CanvasRenderingContext2D) {
			const direction = annotation.direction;
			const pointItems = annotation.points.map(pt => {
				const point = store.get.point(pt);
				if (point) {
					const width = (annotation && annotation.border && annotation.border.width)
						? annotation.border.width
						: 0;
					return transformPoint(point, annotation, width);
				}
				return null;
			}).filter(pt => pt != null);
			const firstPoint = pointItems[0];
			const lastPoint = pointItems[1];
			if (firstPoint == null || lastPoint == null) {
				return;
			}
			if (firstPoint.x === lastPoint.x || firstPoint.y === lastPoint.y) {
				drawLookup.arrow(annotation, ctx, [firstPoint, lastPoint]);
				return;
			}
			const bbox = _.geom.bbox([firstPoint, lastPoint]);

			const points = [firstPoint, _.cloneDeep(firstPoint), _.cloneDeep(firstPoint), lastPoint];

			let midX = firstPoint.x, midY = firstPoint.y;
			if (direction === 'up') {
				midY -= bbox.height / 2;
			} else if (direction === 'right') {
				midX += bbox.width / 2;
			} else if (direction === 'down') {
				midY += bbox.height / 2;
			} else {
				midX -= bbox.width / 2;
			}

			points[1].x = points[2].x = midX;
			points[1].y = points[2].y = midY;

			if (direction === 'up' || direction === 'down') {
				points[2].x = points[3].x;
			} else {
				points[2].y = points[3].y;
			}
			drawLookup.arrow(annotation, ctx, points);
		},

		image(annotation: Annotation, ctx: CanvasRenderingContext2D) {
			const cachedImage = cache.get(annotation, 'rawImage');
			if (cachedImage && cachedImage !== 'pending') {
				const x = Math.floor(annotation.x);
				const y = Math.floor(annotation.y);
				ctx.drawImage(cachedImage, x, y);
			} else if (cachedImage == null) {
				cache.set(annotation, 'rawImage', 'pending');  // Avoid caching multiple times
				const image = new Image();
				image.onload = event => {
					if (event && isSize(event)) {
						annotation.width = event.width;
						annotation.height = event.height;
						cache.set(annotation, 'rawImage', image);
						const page = store.get.pageForItem(annotation);
						Draw.page(page, ctx.canvas);  // eslint-disable-line no-use-before-define
					}
				};
				image.src = annotation.src || '';
			}
		},
	};

	return function(annotationId: number | Annotation, ctx: CanvasRenderingContext2D) {
		let annotation;
		if (typeof annotationId === 'number') {
			annotation = store.get.annotation(annotationId);
		} else {
			annotation = annotationId;
		}
		if (annotation) {
			drawLookup[annotation.annotationType](annotation, ctx);
		}
	};
})();

export const Draw: DrawInterface = {

	page(page: Page, canvas: HTMLCanvasElement, config: DrawConfig = {}) {

		const ctx = canvas.getContext('2d');
		if (ctx == null) {
			return;
		}

		const hiResScale = config.hiResScale = config.hiResScale || 1;
		if (page.needsLayout) {
			store.mutations.page.layout({page});
		}

		ctx.save();
		if (hiResScale > 1) {
			ctx.scale(hiResScale, hiResScale);
		}

		const template = store.state.template.page;
		ctx.clearRect(0, 0, template.width, template.height);

		const rectStyle = {
			strokeStyle: template.border.color,
			// * 2 because line is centered on page edge, so half of it is clipped
			lineWidth: Math.floor(template.border.width * 2),
			fillStyle: null,
		};

		if (template.fill.color) {
			ctx.fillStyle = template.fill.color;
			ctx.fillRect(0, 0, template.width, template.height);
		}

		if (template.fill.image.src) {
			const cachedImage = cache.get('page', 'backgroundImage');
			if (cachedImage) {
				drawPageBackground(cachedImage, template.fill.image, ctx);
			} else {
				const image = new Image();
				image.onload = () => {
					// TODO: this gets called multiple times on initial page load
					cache.set('page', 'backgroundImage', image);
					Draw.page(page, canvas, config);
				};
				image.src = template.fill.image.src;
				return;
			}
		}

		if (template.border.cornerRadius > template.border.width && template.border.color) {
			// On very rounded page corners, outside corner radius shows up inside the page.  Fill that in.
			const s = template.border.cornerRadius / 2;
			ctx.fillStyle = template.border.color;
			ctx.fillRect(0, 0, s, s);
			ctx.fillRect(template.width - s, 0, s, s);
			ctx.fillRect(template.width - s, template.height - s, s, s);
			ctx.fillRect(0, template.height - s, s, s);
		}

		drawRoundedRectStyled(
			// offset corner radius by border width so radius defines inner border radius
			ctx, 0, 0, template.width, template.height,
			template.border.cornerRadius + template.border.width,
			rectStyle
		);

		if (!config.noGrid && uiState.get('grid').enabled) {
			drawGrid(ctx, template.width, template.height);
		}

		ctx.translate(Math.floor(page.innerContentOffset.x), Math.floor(page.innerContentOffset.y));

		page.steps.forEach(id => drawStep(id, ctx, config));

		if (page.stretchedStep != null) {
			ctx.save();
			ctx.translate(Math.floor(page.stretchedStep.leftOffset), 0);
			drawStep(page.stretchedStep.stepID, ctx, config);
			ctx.restore();
		}

		page.pliItems.forEach(id => drawPLIItem(id, ctx, config));

		drawDividers(page.dividers, ctx);

		if (page.numberLabelID != null) {
			const lbl = store.get.numberLabel(page.numberLabelID);
			if (lbl) {
				ctx.save();
				ctx.fillStyle = template.numberLabel.color;
				ctx.font = template.numberLabel.font;
				ctx.textAlign = lbl.align || 'start';
				ctx.textBaseline = lbl.valign || 'alphabetic';
				ctx.fillText(String(page.number), lbl.x, lbl.y);
				ctx.restore();
			}
		}

		page.annotations.forEach(id => {
			drawAnnotation(id, ctx);
		});
		ctx.restore();

		// Draw highlight box around the selected page item, if any
		if (config.selectedItem != null) {
			let doHighlight = false;
			const itemPage = store.get.pageForItem(config.selectedItem);
			if (_.itemEq(itemPage, page)) {
				doHighlight = true;
			} else if (page.stretchedStep != null) {
				const stretchedStep = store.get.step(page.stretchedStep.stepID);
				if (store.get.isDescendent(config.selectedItem, stretchedStep)) {
					doHighlight = true;
				}
			}
			if (doHighlight) {
				const box = store.get.highlightBox(config.selectedItem, template, page);
				if (box != null) {
					drawHighlight(ctx, box);
				}
			}
		}
	},
};

// TODO: Add support for a quantity label to a step. Useful on last step of a submodel built many times.
function drawStep(stepId: number, ctx: CanvasRenderingContext2D, config: DrawConfig) {

	const step = store.get.step(stepId);
	if (step == null) {
		return;
	}

	ctx.save();
	ctx.translate(Math.floor(step.x), Math.floor(step.y));

	if (step.csiID == null && step.steps.length) {
		step.steps.forEach(id => drawStep(id, ctx, config));
	} else if (step.csiID != null) {
		drawCSI(step.csiID, ctx, config);
	}

	step.submodelImages.forEach(submodelImageID => {
		drawSubmodelImage(submodelImageID, ctx, config);
	});

	step.callouts.forEach(calloutID => {
		drawCallout(calloutID, ctx, config);
	});

	if (step.pliID != null && store.state.plisVisible) {
		drawPLI(step.pliID, ctx, config);
	}

	if (step.numberLabelID != null) {
		const lbl = store.get.numberLabel(step.numberLabelID);
		if (lbl) {
			const template = (step.parent.type === 'callout')
				? store.state.template.callout.step
				: store.state.template.step;
			ctx.fillStyle = template.numberLabel.color;
			ctx.font = template.numberLabel.font;
			ctx.textAlign = lbl.align || 'start';
			ctx.textBaseline = lbl.valign || 'alphabetic';
			ctx.fillText(String(step.number), lbl.x, lbl.y);
		}
	}

	if (step.rotateIconID != null) {
		drawRotateIcon(step.rotateIconID, ctx);
	}

	drawDividers(step.dividers, ctx);

	step.annotations.forEach(id => {
		drawAnnotation(id, ctx);
	});
	ctx.restore();
}

function drawSubmodelImage(
	submodelImageId: number, ctx: CanvasRenderingContext2D, {hiResScale = 1, noCache}: DrawConfig
) {
	const submodelImage = store.get.submodelImage(submodelImageId);
	if (submodelImage == null) {
		return;
	}
	const csi = store.get.csi(submodelImage.csiID ?? -1);
	if (csi == null) {
		return;
	}

	const template = store.state.template.submodelImage;
	const rectStyle = {
		fillStyle: template.fill.color,
		strokeStyle: template.border.color,
		lineWidth: template.border.width,
	};
	drawRoundedRectItemStyled(ctx, submodelImage, template.border.cornerRadius, rectStyle);

	ctx.save();
	ctx.translate(
		Math.floor(submodelImage.innerContentOffset.x),
		Math.floor(submodelImage.innerContentOffset.y)
	);

	ctx.save();
	ctx.scale(1 / hiResScale, 1 / hiResScale);
	const part = LDParse.model.get.abstractPart(submodelImage.modelFilename);
	const renderResult = store.render.pli(
		part.colorCode, part.filename, csi, hiResScale, noCache
	);
	if (renderResult) {
		const x = Math.floor((submodelImage.x + csi.x) * hiResScale);
		const y = Math.floor((submodelImage.y + csi.y) * hiResScale);
		ctx.drawImage(renderResult.container, x, y);
	}
	ctx.restore();

	if (submodelImage.quantityLabelID != null) {
		const lbl = store.get.quantityLabel(submodelImage.quantityLabelID);
		if (lbl) {
			ctx.save();
			ctx.fillStyle = template.quantityLabel.color;
			ctx.font = template.quantityLabel.font;
			ctx.textAlign = lbl.align || 'start';
			ctx.textBaseline = lbl.valign || 'alphabetic';
			ctx.fillText('x' + submodelImage.quantity, lbl.x, lbl.y);
			ctx.restore();
		}
	}
	ctx.restore();
}

function drawCSI(
	csiId: number,
	ctx: CanvasRenderingContext2D,
	{hiResScale = 1, selectedItem, noCache}: DrawConfig
) {
	const csi = store.get.csi(csiId);
	if (csi == null) {
		return;
	}
	const step = store.get.parent(csi);
	if (step == null || step.type !== 'step') {
		return;
	}
	const localModel = LDParse.model.get.abstractPart(step.model.filename);

	ctx.save();
	ctx.translate(Math.floor(csi.x), Math.floor(csi.y));

	ctx.save();
	ctx.scale(1 / hiResScale, 1 / hiResScale);
	let havePart = false;
	if (selectedItem?.type === 'part') {
		havePart = ((selectedItem as PartItem).stepID === step.id);
	}
	const selectedPartIDs = (havePart && selectedItem) ? [selectedItem.id] : null;
	const renderer = selectedPartIDs == null ? 'csi' : 'csiWithSelection';
	const res = store.render[renderer](
		localModel, step, csi, selectedPartIDs, hiResScale, noCache
	);
	if (res && res.dx != null && res.dy != null) {
		ctx.drawImage(res.container, Math.floor(-res.dx), Math.floor(-res.dy));
	}
	ctx.restore();

	csi.annotations.forEach(id => {
		drawAnnotation(id, ctx);
	});
	ctx.restore();
}

function drawPLI(
	pliId: number, ctx: CanvasRenderingContext2D, {hiResScale, noCache}: DrawConfig
) {
	const pli = store.get.pli(pliId);
	if (pli == null) {
		return;
	}

	let pliItems = pli.pliItems;
	const template = store.state.template;
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
		lineWidth: template.pli.border.width,
	};
	drawRoundedRectItemStyled(ctx, pli, template.pli.border.cornerRadius, rectStyle);

	ctx.save();
	ctx.translate(Math.floor(pli.innerContentOffset.x), Math.floor(pli.innerContentOffset.y));
	ctx.translate(Math.floor(pli.x), Math.floor(pli.y));
	pliItems.forEach(idx => {
		drawPLIItem(idx, ctx, {hiResScale, noCache});
	});
	ctx.restore();
}

function drawPLIItem(
	pliItemId: number, ctx: CanvasRenderingContext2D, {hiResScale = 1, noCache}: DrawConfig
) {
	const pliItem = store.get.pliItem(pliItemId);
	if (pliItem == null) {
		return;
	}

	ctx.save();
	ctx.scale(1 / hiResScale, 1 / hiResScale);
	const renderResult = store.render.pli(
		pliItem.colorCode, pliItem.filename, pliItem, hiResScale, noCache
	);
	if (renderResult) {
		const x = Math.floor(pliItem.x) * hiResScale;
		const y = Math.floor(pliItem.y) * hiResScale;
		ctx.drawImage(renderResult.container, x, y);
	}
	ctx.restore();

	const quantityLabel = store.get.quantityLabel(pliItem.quantityLabelID);
	if (quantityLabel == null) {
		return;
	}

	const template = store.state.template.pliItem.quantityLabel;
	ctx.fillStyle = template.color;
	ctx.font = template.font;
	ctx.textBaseline = quantityLabel.valign || 'top';
	ctx.fillText(
		'x' + pliItem.quantity,
		pliItem.x + quantityLabel.x,
		pliItem.y + quantityLabel.y
	);
}

function drawCallout(calloutId: number, ctx: CanvasRenderingContext2D, config: DrawConfig) {
	const template = store.state.template.callout;
	const callout = store.get.callout(calloutId);
	if (callout == null) {
		return;
	}
	ctx.save();

	const rectStyle = {
		fillStyle: template.fill.color,
		strokeStyle: template.border.color,
		lineWidth: template.border.width,
	};
	drawRoundedRectItemStyled(ctx, callout, template.border.cornerRadius, rectStyle);

	ctx.translate(Math.floor(callout.x), Math.floor(callout.y));

	callout.steps.forEach(id => drawStep(id, ctx, config));

	if (template.arrow.border.color != null) {
		ctx.strokeStyle = template.arrow.border.color;
		ctx.fillStyle = template.arrow.border.color;
	}
	ctx.lineWidth = template.arrow.border.width;
	callout.calloutArrows.forEach(arrowID => {
		drawCalloutArrow(arrowID, ctx);
	});
	ctx.restore();
}

function drawCalloutArrow(arrowId: number, ctx: CanvasRenderingContext2D) {
	const arrow = store.get.calloutArrow(arrowId);
	if (arrow == null) {
		return;
	}
	const border = store.state.template.callout.arrow.border;
	if (!isBorderVisible(border)) {
		return;
	}
	drawAnnotation({
		id: arrow.id,
		type: 'annotation',
		annotationType: (arrow.points.length > 2) ? 'arrow' : 'stairStepArrow',
		parent: _.clone(arrow.parent),
		border,
		points: arrow.points,
		direction: arrow.direction,
		color: '', font: '', text: '', align: 'left', valign: 'top',
		x: 0, y: 0, width: 0, height: 0,
	}, ctx);
}

function drawRotateIcon(iconId: number, ctx: CanvasRenderingContext2D) {
	const template = store.state.template.rotateIcon;
	const icon = store.get.rotateIcon(iconId);
	if (icon == null) {
		return;
	}
	const scale = {  // Icon is drawn in 100 x 94 space; scale to that
		width: icon.width / 100,  // TODO: put Layout.rotateIconAspectRatio somewhere easier to read
		height: icon.height / 94,
	};

	if (template.border.color != null) {
		ctx.strokeStyle = template.border.color;
	}
	ctx.lineWidth = template.border.width;
	ctx.save();
	ctx.translate(Math.floor(icon.x), Math.floor(icon.y));
	ctx.scale(scale.width, scale.height);

	if (template.fill.color) {
		ctx.fillStyle = template.fill.color;
		drawRoundedRect(
			ctx,
			0, 0, 100, 94,
			template.border.cornerRadius,
			template.border.width
		);
		ctx.fill();
	}

	const haveBorder = isBorderVisible(template.border);
	if (haveBorder) {
		drawRoundedRect(
			ctx,
			0, 0, 100, 94,
			template.border.cornerRadius,
			template.border.width
		);
	}
	ctx.restore();
	if (haveBorder) {
		ctx.stroke();  // Stroke in unscaled space to ensure borders of constant width
	}

	if (isBorderVisible(template.arrow.border)) {
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

		drawArrowHead(ctx, 24, 67, 135, [1, 0.7]);
		ctx.fill();
		drawArrowHead(ctx, 75, 27, -45, [1, 0.7]);
		ctx.fill();
	}
	ctx.restore();
}

function drawPageBackground(
	cachedImage: HTMLImageElement, imageInfo: ImageTemplate, ctx: CanvasRenderingContext2D
) {
	if (imageInfo.x != null && imageInfo.y != null) {
		ctx.drawImage(cachedImage,
			imageInfo.x, imageInfo.y,
			imageInfo.width, imageInfo.height
		);
	} else {
		ctx.drawImage(cachedImage, 0, 0);
	}
}

function drawDividers(dividerList: number[], ctx: CanvasRenderingContext2D) {
	const template = store.state.template.divider.border;
	if (!isBorderVisible(template)) {
		return;
	}
	ctx.strokeStyle = template.color;
	ctx.lineWidth = template.width;
	dividerList.forEach(id => {
		const divider = store.get.divider(id);
		if (divider == null) {
			return;
		}
		ctx.beginPath();
		const p1 = pixelOffset(divider.p1, template.width);
		ctx.moveTo(p1.x, p1.y);
		const p2 = pixelOffset(divider.p2, template.width);
		ctx.lineTo(p2.x, p2.y);
		ctx.stroke();
	});
}

function drawHighlight(ctx: CanvasRenderingContext2D, box: Box) {
	ctx.save();
	ctx.strokeStyle = '#2eb9ce';
	ctx.lineWidth = 3;
	ctx.setLineDash([5, 3]);
	ctx.strokeRect(box.x, box.y, box.width, box.height);
	ctx.restore();
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number) {

	const grid = uiState.get('grid');
	let gridPath = cache.get('uiState', 'gridPath');
	if (gridPath == null) {
		gridPath = buildGrid(grid, width, height);
		cache.set('uiState', 'gridPath', gridPath);
	}

	ctx.save();
	ctx.lineWidth = grid.line.width;
	if (grid.line.color === 'auto') {
		const pageColor = store.state.template.page.fill.color;
		ctx.strokeStyle = _.color.opposite(pageColor);
	} else {
		ctx.strokeStyle = grid.line.color;
	}
	if (!_.isEmpty(grid.line.dash)) {
		ctx.setLineDash(grid.line.dash);
	}
	ctx.stroke(gridPath);
	ctx.restore();
}

function buildGrid(grid: any, width: number, height: number) {
	const gridSize = Math.max(1, Math.floor(grid.spacing));
	const po = (grid.line.width % 2) ? 0.5 : 0;
	const path = new Path2D();
	let x = grid.offset.left, y = grid.offset.top;

	while (x < width) {  // vertical lines
		path.moveTo(x + po, 0);
		path.lineTo(x + po, height);
		x += gridSize;
	}
	while (y < height) {  // horizontal lines
		path.moveTo(0, y + po);
		path.lineTo(width, y + po);
		y += gridSize;
	}
	return path;
}

function drawRoundedRectItemStyled(
	ctx: CanvasRenderingContext2D, item: any, r: number, style: StyleInterface
) {
	let {x, y, width, height} = item;
	if (item.borderOffset) {
		x += item.borderOffset.x;
		y += item.borderOffset.y;
	}
	if (item.innerContentOffset) {
		x += item.innerContentOffset.x / 2;
		y += item.innerContentOffset.y / 2;
		width -= item.innerContentOffset.x;
		height -= item.innerContentOffset.y;
	}
	drawRoundedRectStyled(ctx, x, y, width, height, r, style);
}

function drawRoundedRectStyled(
	ctx: CanvasRenderingContext2D,
	x: number, y: number, w: number, h: number, r: number,
	style: StyleInterface
) {
	ctx.save();
	if (style.fillStyle && _.color.isVisible(style.fillStyle)) {
		ctx.fillStyle = style.fillStyle;
		drawRoundedRect(ctx, x, y, w, h, r, style.lineWidth);
		ctx.fill();
	}
	const b = {width: style.lineWidth, color: style.strokeStyle};
	if (isBorderVisible(b)) {
		ctx.strokeStyle = b.color;
		ctx.lineWidth = b.width;
		drawRoundedRect(ctx, x, y, w, h, r, b.width);
		ctx.stroke();
	}
	ctx.restore();
}

interface VisibleBorder {
	width: number;
	color: string;
}

// typesafe version of _isBorderVisible mixin
function isBorderVisible(border: Border): border is VisibleBorder {
	return _.isBorderVisible(border);
}

function drawRoundedRect(
	ctx: CanvasRenderingContext2D,
	x: number, y: number, w: number, h: number, r: number, lineWidth: number
) {
	// r defines the inner curve, but we're drawing from the middle, so offset r accordingly
	// r += lineWidth / 2;  //Disabled for now because it doesn't look right.
	({x, y} = pixelOffset({x, y}, lineWidth));
	w = Math.floor(w);
	h = Math.floor(h);
	ctx.beginPath();
	ctx.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
	ctx.arc(x + w - r, y + r, r, 3 * Math.PI / 2, 0);
	ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
	ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
	ctx.closePath();
}

function pixelOffset({x, y}: Point, lineWidth: number): Point {
	x = Math.floor(x);
	y = Math.floor(y);
	if (lineWidth % 2) {  // Avoid half-pixel offset blurry lines
		x += 0.5;
		y += 0.5;
	}
	return {x, y};
}
