/* Web Lic - Copyright (C) 2019 Remi Gagne */

import mitt from 'mitt';

import type {LookupItem} from './item_types';

type Events = {
    'draw-current-page': void;
    'force-update': void;
    'hide-menus': void;
    'key-press': {key: string};
	'page-resize': void;
	'redraw-ui': {clearSelection?: boolean};
    'scroll-to-page': {pageId: number};
    'set-page-view': {facingPage: boolean, scroll: boolean};
	'set-selected': LookupItem;
    'show-menu': {e: MouseEvent};
};

const EventBus = mitt<Events>();
export default EventBus;
