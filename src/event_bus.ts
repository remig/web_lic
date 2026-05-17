/* Web Lic - Copyright (C) 2019 Remi Gagne */

import mitt from "mitt";

type Events = {
	"set-selected": any;
	"state-change": undefined;
	"page-resize": undefined;
	"redraw-ui": { clearSelection?: boolean } | undefined;
	"push-to-undo": { undoText: string; mutation: string; opts: any };
};

const EventBus = mitt<Events>();
export default EventBus;
