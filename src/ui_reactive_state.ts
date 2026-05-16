/* Web Lic - Copyright (C) 2019 Remi Gagne */

import { reactive, ref } from 'vue';

export const statusText = ref('');
export const busyText = ref('');
export const filename = ref<string | null>(null);
export const currentPageId = ref<number | null>(null);
export const dirtyState = reactive({ undoIndex: 0, lastSaveIndex: 0 });
export const selectedItemLookup = ref<any>(null);
export const contextMenu = ref<any>(null);
export const lastRightClickPos = reactive<{ x: number; y: number }>({
	x: 0,
	y: 0,
});

let progress = 0,
	count = 0,
	text = '';

export function updateProgress(
	opts?: string | { stepCount?: number; clear?: boolean; text?: string } | null,
) {
	if (opts == null) {
		progress++;
	} else if (typeof opts === 'string') {
		progress++;
		text = opts;
	} else {
		if (opts.stepCount) {
			count = opts.stepCount;
			progress = 0;
		}
		if (opts.clear) {
			busyText.value = text = '';
			progress = count = 0;
		}
		if (opts.text) {
			text = opts.text;
		}
	}
	// This gets called several times a second during long-lived processes.
	// Vue's reactivity is too slow and resource intensive to use here.
	const bar = document.getElementById('progressbar');
	if (bar) {
		const pct = Math.floor((progress / count) * 100) || 0;
		bar.style.width = `${pct}%`;
		bar.innerText = text || bar.style.width;
	}
}
