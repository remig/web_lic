/* Web Lic - Copyright (C) 2019 Remi Gagne */

import {LookupItem} from './item_types';

let stateCache: {[key: string]: any} = {};

interface Cache {
	get(item: string | LookupItem, key: string, defaultValue: any): any;
	set(item: string | LookupItem, key: string, newValue: any): void;
	clear(item: string | LookupItem): void;
	reset(): void;
	stateCache: {[key: string]: any};
}

const cacheAPI: Cache = {
	// For temporary state-based data that's transient yet expensive to recompute.
	// Keys are either [item type][item ID][cache key] for info specific to exactly one item, or
	// [item type][cache key] for info specific to all items of one type.
	get(item: string | LookupItem, key: string, defaultValue: any) {
		if (typeof item === 'string') {
			if (stateCache[item] && stateCache[item][key]) {
				return stateCache[item][key];
			}
		} else if (item && item.type && item.id != null
			&& stateCache[item.type] && stateCache[item.type][item.id]
		) {
			return stateCache[item.type][item.id][key];
		}
		return defaultValue;
	},
	set(item: string | LookupItem, key: string, newValue: any) {
		if (typeof item === 'string') {
			stateCache[item] = stateCache[item] || {};
			stateCache[item][key] = newValue;
		} else if (item && item.type && item.id != null) {
			stateCache[item.type] = stateCache[item.type] || {};
			stateCache[item.type][item.id] = stateCache[item.type][item.id] || {};
			stateCache[item.type][item.id][key] = newValue;
		}
	},
	clear(item: string | LookupItem) {
		if (typeof item === 'string') {
			delete stateCache[item];
		} else if (item && item.type && item.id != null && stateCache[item.type]) {
			delete stateCache[item.type][item.id];
		}
	},
	reset() {
		stateCache = {};
	},
	stateCache,
};

export default cacheAPI;
