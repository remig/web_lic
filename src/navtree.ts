/* Web Lic - Copyright (C) 2019 Remi Gagne */

import _ from './util';
import store from './store';
import uiState from './ui_state';
import EventBus from './event_bus';
import LDParse from './ld_parse';
import {tr} from './translations';
import {isQuantityLabelParent} from './type_helpers';

let lastSelectedId: string | null;
let invisibleNodeTypes: Set<string>;
let expandedNodes: Set<string>;

(function loadUIState() {

	expandedNodes = new Set(uiState.get('navTree.expandedNodes'));

	invisibleNodeTypes = new Set();
	const checkedItems: {[key: string]: boolean} = uiState.get('navTree.checkedItems');
	for (const key in checkedItems) {
		if (checkedItems.hasOwnProperty(key)
			&& !checkedItems[key]
			&& key !== 'all' && key !== 'group_parts' && key !== 'page_step_parts'
		) {
			invisibleNodeTypes.add(key);
		}
	}
})();

function nodeIdToItem(nodeId: string): any {
	const id = nodeId.split('_');
	const type = id[1] as ItemTypeNames;
	const res: any = {type, id: parseInt(id[2], 10)};
	if (id.length > 3) {
		res.stepID = parseInt(id[3], 10);
	}
	if (id.length > 4) {
		res.filename = id[4];
	}
	return res;
}

function nicePartName(filename: string): string {
	const part: AbstractPart = LDParse.partDictionary[filename];
	if (part == null || !part.name) {
		return 'Unknown Part';
	} else if (part.isSubModel) {
		return part.name.replace(/\.(mpd|ldr)/ig, '');
	}
	return part.name.replace(' x ', 'x');
}

function niceColorName(colorCode: number): string {
	const name = LDParse.getColor(colorCode, 'name');
	return name ? name.replace(/_/g, ' ') : '';
}

function getItemId(item: ItemTypes) {
	const fields: string[] = [item.type, item.id.toString()];
	if (item.type === 'part') {
		fields.push(item.stepID.toString());
	} else if (item.type === 'submodel') {
		fields.push(item.filename);
	}
	return fields.join('_');
}

function getItemText(t: ItemTypes): string {
	if (!t || !t.type) {
		return '';
	} else if (t.type === 'book') {
		return tr('glossary.book_count_@c', t.number);
	} else if (t.type === 'page') {
		if (t.subtype === 'page') {
			return tr('glossary.page_count_@c', t.number);
		} else if (t.subtype === 'inventoryPage') {
			return tr('glossary.inventorypage', t.number);
		}
		return tr('glossary.' + t.subtype.toLowerCase());
	} else if (t.type === 'step') {
		return (t.number == null)
			? tr('glossary.step')
			: tr('glossary.step_count_@c', t.number);
	} else if (t.type === 'submodel') {
		return t.filename;
	} else if (t.type === 'annotation') {
		return tr(`action.annotation.types.${t.annotationType}`);
	} else if (t.type === 'callout') {
		return tr('glossary.callout') + ' ' + tr('glossary.' + t.position);
	} else if (t.type === 'pliItem') {
		return `${nicePartName(t.filename)} - ${niceColorName(t.colorCode)}`;
	} else if (t.type === 'quantityLabel') {
		const parent = store.get.parent(t);
		if (isQuantityLabelParent(parent)) {
			return tr('glossary.quantitylabel_count_@c', parent.quantity);
		}
		return tr('glossary.quantitylabel');
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

function getChildItems(item: ItemTypes): ItemTypes[] {

	let children = store.get.children(item);

	// Special case: draw step parts as children of CSI
	if (item.type === 'csi') {
		const parent = store.get.parent(item);
		if (parent?.type === 'step') {
			const parts = parent.parts.map(id => {
				return {type: 'part', id, stepID: parent.id, parent} as PartItem;
			});
			children = children.concat(parts);
		}
	}
	return children;
}

function setArrowIcon(parent: Element, state: 'open' | 'close'): void {
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

function expandNode(node: Element): void {
	const childNode = node.querySelector(':scope > .treeChildren');
	if (childNode) {
		childNode.classList.remove('hidden');
		expandedNodes.add(node.id);
		uiState.set('navTree.expandedNodes', Array.from(expandedNodes));
	}
	setArrowIcon(node, 'open');
}

function collapseNode(node: Element): void {
	const childNode = node.querySelector(':scope > .treeChildren');
	if (childNode) {
		childNode.classList.add('hidden');
		expandedNodes.delete(node.id);
		uiState.set('navTree.expandedNodes', Array.from(expandedNodes));
	}
	setArrowIcon(node, 'close');
}

function toggleNode(node: Element): void {
	if (expandedNodes.has(node.id)) {
		collapseNode(node);
	} else {
		expandNode(node);
	}
}

function expandAncestors(node: Element): void {
	let parent = node.parentElement;
	while (parent && !parent.classList.contains('treeScroll')) {
		if (parent.classList.contains('treeParent')) {
			expandNode(parent);
		}
		parent = parent.parentElement;
	}
}

function handleClick(e: MouseEvent): void {
	const node: HTMLElement = e?.target as HTMLElement;
	if (node == null || node.parentElement == null) {
		return;
	}
	if (node.classList.contains('treeIcon') && node.parentElement != null) {
		toggleNode(node.parentElement);
	} else if (node.classList.contains('treeText')) {
		EventBus.$emit('set-selected', nodeIdToItem(node.id));
	}
}

function createTree(): void {

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
	if (container != null) {
		_.dom.emptyNode(container);
		container.appendChild(root);
	}
}

function createNode(item: ItemTypes): HTMLLIElement | null {

	if (invisibleNodeTypes.has(item.type)) {
		return null;
	}
	const container = document.createElement('li');
	const children = getChildItems(item);
	const childNodes = children.map(createNode)
		.filter((node): node is HTMLLIElement => node != null);

	const textNode = _.dom.createElement('span', {
		id: 'treeRow_' + getItemId(item),
		'class': 'treeText',
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

function expandToLevel(
	node: Element, level: number, currentLevel: number
): void {

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

function collapseAll(node: Element) {
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

interface API {
	update(): void;
	selectItem(lookup: LookupItem): void;
	clearSelected(): void;
	expandToLevel(level: number): void;
	collapseAll(): void;
	setInvisibleNodeTypes(newTypes: (string)[]): void;
}

const api: API = {
	update() {
		createTree();
	},
	selectItem(lookup) {
		const item = store.get.lookupToItem(lookup);
		if (item == null) {
			return;
		}
		const id = 'treeRow_' + getItemId(item);
		if (lastSelectedId) {
			if (lastSelectedId === id) {
				return; // Selected item didn't actually change
			}
			const node = document.getElementById(lastSelectedId);
			if (node) {
				node.classList.remove('treeSelected');
			}
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
			const node = document.getElementById(lastSelectedId);
			if (node) {
				node.classList.remove('treeSelected');
			}
			lastSelectedId = null;
		}
	},
	expandToLevel(level) {
		const container = document.getElementById('nav-tree');
		if (container?.firstElementChild != null) {
			expandToLevel(container.firstElementChild, level, 0);
		}
	},
	collapseAll() {
		const container = document.getElementById('nav-tree');
		if (container?.firstElementChild != null) {
			collapseAll(container.firstElementChild);
		}
	},
	setInvisibleNodeTypes(newTypes) {
		if (!_.isEqual(invisibleNodeTypes, newTypes)) {
			invisibleNodeTypes = new Set(newTypes);
			api.update();
		}
	},
};

export default api;
