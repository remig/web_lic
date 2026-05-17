/* Web Lic - Copyright (C) 2018 Remi Gagne */

import React from "react";
import { createRoot } from "react-dom/client";

import LDParse from "./ld_parse";
import Storage from "./storage";
import store from "./store";
import App from "./ui";
import uiState from "./ui_state";
import undoStack from "./undo_stack";
import _ from "./util";

declare global {
	interface Window {
		__lic: any;
	}
}

window.__lic = { _, store, undoStack, LDParse, Storage, uiState };

const container = document.getElementById("app")!;
const root = createRoot(container);
root.render(<App />);
