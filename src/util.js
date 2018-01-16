/* global module: false, LDRender: false, LDParse: false */

// eslint-disable-next-line no-implicit-globals, no-undef
util = (function() {
'use strict';

function renderPart(domID, forceRedraw, renderCB) {
	let container = document.getElementById(domID);
	if (!container || forceRedraw) {
		if (!container) {
			container = document.createElement('canvas');
			container.setAttribute('id', domID);
			container.setAttribute('class', 'offscreen');
			document.getElementById('canvasHolder').appendChild(container);
		}
		renderCB(container);
	}
	return {width: container.width, height: container.height, container};
}

const util = {
	array(fakeArray) {
		return [].slice.apply(fakeArray);
	},
	getSubmodel(mainModel, submodelIDList) {
		if (!submodelIDList) {
			return mainModel;
		}
		return (submodelIDList || []).reduce((p, id) => LDParse.partDictionary[p.parts[id].filename], mainModel);
	},
	renderCSI(localModel, step, forceRedraw) {
		const domID = `CSI_${step.csiID}`;
		return renderPart(domID, forceRedraw, container => {
			const lastPart = step.parts ? step.parts[step.parts.length - 1] : null;
			LDRender.renderModel(localModel, container, 1000, {endPart: lastPart, resizeContainer: true});
		});
	},
	renderPLI(part, forceRedraw) {
		const domID = `PLI_${part.filename}_${part.colorCode}`;
		return renderPart(domID, forceRedraw, container => {
			LDRender.renderPart(part, container, 1000, {resizeContainer: true});
		});
	},
	measureLabel: (() => {
		const labelSizeCache = {};  // {font: {text: {width: 10, height: 20}}}
		return function(font, text) {
			if (labelSizeCache[font] && labelSizeCache[font][text]) {
				return labelSizeCache[font][text];
			}
			const container = document.getElementById('fontMeasureContainer');
			container.style.font = font;
			container.firstChild.textContent = text;
			const res = container.getBBox();
			res.width = Math.ceil(res.width);
			res.height = Math.ceil(res.height);
			labelSizeCache[font] = labelSizeCache[font] || {};
			labelSizeCache[font][text] = res;
			return res;
		};
	})(),
	emptyNode(node) {
		if (node) {
			while (node.firstChild) {
				node.removeChild(node.firstChild);
			}
		}
	},
	roundedRect(ctx, x, y, w, h, r) {
		ctx.beginPath();
		ctx.arc(x + r, y + r, r, Math.PI, 3 * Math.PI / 2);
		ctx.arc(x + w - r, y + r, r, 3 * Math.PI / 2, 0);
		ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
		ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
		ctx.closePath();
	},
	clone(obj) {
		return JSON.parse(JSON.stringify(obj));
	},
	sort: {
		numeric: {
			ascending(a, b) {
				return a - b;
			},
			descending(a, b) {
				return b - a;
			}
		}
	},
	formatTime(start, end) {
		const t = end - start;
		if (t >= 1000) {
			return (t / 1000).toFixed(2) + 's';
		}
		return t + 'ms';
	},
	titleCase(s) {  // Human readable versions of common internal strings
		s = s || '';
		switch (s.toLowerCase()) {
			case 'csi':
				return 'CSI';
			case 'pli':
				return 'PLI';
			case 'pliitem':
				return 'PLI Item';
			case 'pliqty':
				return 'PLI Quantiy Label';
			case 'stepnumber':
				return 'Step Number';
			case 'pagenumber':
				return 'Page Number';
		}
		return (s + '').replace(/([^\W_]+[^\s-]*) */g, function(el) {
			return el.charAt(0).toUpperCase() + el.substr(1).toLowerCase();
		});
	}
};

if (typeof module !== 'undefined' && module.exports != null) {
	module.exports = util;
}

return util;

})();
