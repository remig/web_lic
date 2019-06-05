/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from './util';
import store from './store';
import uiState from './uiState';
import EventBus from './event_bus';
import LDParse from './LDParse';
import LocaleManager from './components/translate.vue';

const tr = LocaleManager.translate;

let lastSelectedId, invisibleNodeTypes, expandedNodes;

(function loadUIState() {

	expandedNodes = new Set(uiState.get('navTree.expandedNodes'));

	invisibleNodeTypes = new Set();
	const checkedItems = uiState.get('navTree.checkedItems');
	for (const key in checkedItems) {
		if (checkedItems.hasOwnProperty(key)
			&& !checkedItems[key]
			&& key !== 'all' && key !== 'group_parts' && key !== 'page_step_parts'
		) {
			invisibleNodeTypes.add(key);
		}
	}
})();

function nodeToItem(node) {
	const id = node.id.split('_');
	const res = {type: id[1], id: parseInt(id[2], 10)};
	if (id.length > 3) {
		res.stepID = parseInt(id[3], 10);
	}
	return res;
}

function nicePartName(filename) {
	const part = LDParse.partDictionary[filename];
	if (!part || !part.name) {
		return 'Unknown Part';
	} else if (part.isSubModel) {
		return part.name.replace(/\.(mpd|ldr)/ig, '');
	}
	return part.name.replace(' x ', 'x');
}

function niceColorName(colorCode) {
	const name = LDParse.getColor(colorCode, 'name');
	return name ? name.replace(/_/g, ' ') : '';
}

function getItemId(item) {
	return item.type + '_' + item.id + ((item.stepID == null) ? '' : '_' + item.stepID);
}

function getItemText(t) {
	if (!t) {
		return '';
	} else if (t.type === 'page') {
		return tr('glossary.page_count_@c', t.number);
	} else if (t.type === 'inventoryPage') {
		return tr('glossary.inventorypage', t.number);
	} else if (t.type === 'step') {
		return tr('glossary.step_count_@c', t.number);
	} else if (t.type === 'submodel') {
		return t.filename;
	} else if (t.type === 'annotation') {
		switch (t.annotationType) {
			case 'label':
				return t.text;
		}
	} else if (t.type === 'callout') {
		return tr('glossary.callout') + ' ' + tr('glossary.' + t.position);
	} else if (t.type === 'pliItem') {
		return `${nicePartName(t.filename)} - ${niceColorName(t.colorCode)}`;
	} else if (t.type === 'quantityLabel') {
		return tr('glossary.quantitylabel_count_@c', store.get.parent(t).quantity);
	} else if (t.type === 'part') {
		const step = store.get.step(t.stepID);
		const part = LDParse.model.get.partFromID(t.id, step.model.filename);
		const partName = nicePartName(part.filename);
		const partColor = niceColorName(part.colorCode);
		if (partColor) {
			return `${partName} - ${partColor}`;
		}
		return `${partName}`;
	}
	return tr('glossary.' + t.type.toLowerCase());
}

function getChildItems(item) {

	let children = store.get.children(item);

	// Special case: draw step parts as children of CSI
	if (item.type === 'csi') {
		const parent = store.get.parent(item);
		if (parent && Array.isArray(parent.parts)) {
			children = parent.parts.map(part => {
				return {id: part, stepID: parent.id, type: 'part'};
			});
		}
	}
	return children;
}

function setArrowIcon(parent, state) {
	const icon = parent.querySelector(':scope > .treeIcon');
	if (icon) {
		if (state === 'open') {
			icon.classList.remove('fa-caret-right');
			icon.classList.add('fa-caret-down');
		} else if (state === 'close') {
			icon.classList.add('fa-caret-right');
			icon.classList.remove('fa-caret-down');
		}
	}
}

function expandNode(node) {
	const childNode = node.querySelector(':scope > .treeChildren');
	if (childNode) {
		childNode.classList.remove('hidden');
		expandedNodes.add(node.id);
		uiState.set('navTree.expandedNodes', Array.from(expandedNodes));
	}
	setArrowIcon(node, 'open');
}

function collapseNode(node) {
	const childNode = node.querySelector(':scope > .treeChildren');
	if (childNode) {
		childNode.classList.add('hidden');
		expandedNodes.delete(node.id);
		uiState.set('navTree.expandedNodes', Array.from(expandedNodes));
	}
	setArrowIcon(node, 'close');
}

function toggleNode(node) {
	if (expandedNodes.has(node.id)) {
		collapseNode(node);
	} else {
		expandNode(node);
	}
}

function expandAncestors(node) {
	let parent = node.parentNode;
	while (parent && !parent.classList.contains('treeScroll')) {
		if (parent.classList.contains('treeParent')) {
			expandNode(parent);
		}
		parent = parent.parentNode;
	}
}

function handleClick(e) {
	if (!e || !e.target || !e.target.parentNode) {
		return;
	}
	const node = e.target;
	if (node.classList.contains('treeIcon')) {
		toggleNode(node.parentNode);
	} else if (node.classList.contains('treeText')) {
		EventBus.$emit('set-selected', nodeToItem(node));
	}
}

function createTree() {

	const root = document.createElement('ul');
	root.addEventListener('click', handleClick);

	const items = store.get.topLevelTreeNodes();
	items.forEach(item => {
		const child = createNode(item);
		if (child) {
			root.appendChild(child);
		}
	});

	const container = document.getElementById('nav-tree');
	_.dom.emptyNode(container);
	container.appendChild(root);
}

function createNode(item) {

	if (invisibleNodeTypes.has(item.type)) {
		return null;
	}

	const container = document.createElement('li');
	const children = getChildItems(item);
	const childNodes = children.map(createNode).filter(el => !!el);

	const textNode = _.dom.createElement('span', {
		id: 'treeRow_' + getItemId(item),
		'class': 'treeText'
	}, null, getItemText(item));

	if (childNodes.length) {

		const id = 'treeParent_' + getItemId(item);
		const div = _.dom.createElement('div', {id, 'class': 'treeParent'}, container);
		_.dom.createElement('i', {'class': 'treeIcon fas fa-lg fa-caret-right'}, div);
		div.appendChild(textNode);

		const childContainer = _.dom.createElement('ul', {'class': 'treeChildren hidden'}, div);
		childNodes.forEach(childNode => {
			childContainer.appendChild(childNode);
		});

		if (expandedNodes.has(id)) {
			expandNode(div);
		}
	} else {
		container.appendChild(textNode);
	}
	return container;
}

function expandToLevel(node, level, currentLevel) {

	if (node.classList.contains('treeParent')) {
		expandNode(node);
	}
	if (currentLevel === level) {
		return;
	}
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (child.nodeName !== 'I' && child.nodeName !== 'SPAN') {
			if (child.classList.contains('treeParent')) {
				expandToLevel(child, level, currentLevel + 1);
			} else {
				expandToLevel(child, level, currentLevel);
			}
		}
	}
}

function collapseAll(node) {
	if (node.classList.contains('treeParent')) {
		collapseNode(node);
	}
	for (let i = 0; i < node.children.length; i++) {
		const child = node.children[i];
		if (child.nodeName !== 'I' && child.nodeName !== 'SPAN') {
			collapseAll(child);
		}
	}
}

const api = {
	update() {
		createTree();
	},
	selectItem(item) {
		const id = 'treeRow_' + getItemId(item);
		if (lastSelectedId) {
			if (lastSelectedId === id) {
				return; // Selected item didn't actually change
			}
			document.getElementById(lastSelectedId).classList.remove('treeSelected');
		}
		const node = document.getElementById(id);
		if (node) {
			node.classList.add('treeSelected');
			expandAncestors(node);
			lastSelectedId = id;
		}
	},
	clearSelected() {
		if (lastSelectedId) {
			document.getElementById(lastSelectedId).classList.remove('treeSelected');
			lastSelectedId = null;
		}
	},
	expandToLevel(level) {
		const container = document.getElementById('nav-tree');
		expandToLevel(container.firstChild, level, 0);
	},
	collapseAll() {
		const container = document.getElementById('nav-tree');
		collapseAll(container.firstChild);
	},
	setInvisibleNodeTypes(newTypes) {
		if (!_.isEqual(invisibleNodeTypes, newTypes)) {
			invisibleNodeTypes = new Set(newTypes);
			api.update();
		}
	}
};

export default api;
