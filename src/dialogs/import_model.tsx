/* Web Lic - Copyright (C) 2018 Remi Gagne */

import { useState } from "react";
import { FormControlLabel } from "@mui/material";
import Checkbox from "@mui/material/Checkbox";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { Button } from "../components/button";

import LDParse from "../ld_parse";
import store from "../store";
import { tr } from "../translations";
import uiState from "../ui_state";
import undoStack from "../undo_stack";
import _ from "../util";

interface Props {
	model: any;
	startTime: number;
	onBusy: (text: string) => void;
	onProgress: (opts?: any) => void;
	onSetPage: (id: number | null) => void;
	onForceUpdate: () => void;
	onStatus: (text: string) => void;
	onRedraw: () => void;
	onClose: () => void;
}

export default function ImportModelDialog({
	model,
	startTime,
	onBusy,
	onProgress,
	onSetPage,
	onForceUpdate,
	onStatus,
	onRedraw,
	onClose,
}: Props) {
	const includePartsPerStep = _.isEmpty(model.steps);
	const [newState, setNewState] = useState<any>(() => {
		const base = { ...uiState.get("dialog.importModel") };
		if (includePartsPerStep) {
			const partCount = LDParse.model.get.partCount(model);
			base.partsPerStep = _.clamp(Math.floor(partCount / 10), 1, 20);
		} else {
			base.partsPerStep = null;
		}
		return base;
	});
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	function checkIncludeItem(item: string) {
		setNewState((prev: any) => ({
			...prev,
			include: { ...prev.include, [item]: !prev.include[item] },
		}));
	}

	async function ok() {
		onClose();
		store.mutations.pli.toggleVisibility({ visible: newState.include.pli });
		store.mutations.addInitialPages({
			partsPerStep: newState.partsPerStep,
		} as any);
		store.mutations.addInitialSubmodelImages();
		if (newState.useMaxSteps) {
			onBusy(tr("dialog.busy_indicator.merging_steps"));
			await store.mutations.mergeInitialPages(onProgress);
		}
		if (newState.include.partListPage) {
			store.mutations.inventoryPage.add();
		}
		if (newState.include.titlePage) {
			store.mutations.titlePage.add();
		}
		store.saveLocal();
		const firstPage = store.get.firstPage();
		onSetPage(firstPage?.id ?? null);
		undoStack.saveBaseState();
		onForceUpdate();
		onProgress({ clear: true });
		const time = _.formatTime(startTime, Date.now());
		onStatus(
			tr("action.file.import_model.success_message_@mf", {
				filename: store.get.modelFilename(),
				time,
			})
		);
		setTimeout(onRedraw, 0);
	}

	return (
		<Dialog
			open
			onClose={onClose}
			maxWidth={false}
			className="importModelDialog"
			PaperProps={{ style: { width: "630px", padding: 0 } }}
		>
			<DialogTitle>{tr("dialog.import_model.title")}</DialogTitle>
			<DialogContent style={{ padding: 0 }}>
				{includePartsPerStep && (
					<div style={{ margin: 20 }}>
						<span>{tr("dialog.import_model.parts_per_step_1")}</span>
						<input
							type="number"
							min={1}
							className="form-control parts-per-step"
							value={newState.partsPerStep}
							style={{ display: "inline", width: 80, margin: "0 5px" }}
							onChange={(e) =>
								setNewState((p: any) => ({
									...p,
									partsPerStep: parseInt(e.target.value, 10),
								}))
							}
						/>
						<span>{tr("dialog.import_model.parts_per_step_2")}</span>
					</div>
				)}
				<div style={{ margin: 20 }}>
					<span>{tr("dialog.import_model.steps_per_page")}</span>
					<input
						type="number"
						min={1}
						max={10}
						className="form-control"
						value={newState.stepsPerPage}
						disabled={newState.useMaxSteps}
						style={{ display: "inline", width: 80, margin: "0 20px 0 10px" }}
						onChange={(e) =>
							setNewState((p: any) => ({
								...p,
								stepsPerPage: parseInt(e.target.value, 10),
							}))
						}
					/>
					<FormControlLabel
						className="el-checkbox"
						control={
							<Checkbox
								checked={newState.useMaxSteps}
								data-testid="import-use-max-steps"
								onChange={(e) =>
									setNewState((p: any) => ({
										...p,
										useMaxSteps: e.target.checked,
									}))
								}
							/>
						}
						label={tr("dialog.import_model.use_max_steps")}
					/>
				</div>
				<div style={{ margin: 20 }}>
					<Button
						data-testid="import-include-dropdown"
						variant="outlined"
						wide
						onClick={(e) => setAnchorEl(e.currentTarget)}
					>
						{tr("dialog.import_model.include.root")}
					</Button>
					<Menu
						anchorEl={anchorEl}
						open={Boolean(anchorEl)}
						onClose={() => setAnchorEl(null)}
						slotProps={{ paper: { style: { minWidth: 320 } } }}
					>
						{Object.entries(newState.include || {}).map(([item, checked]) => (
							<MenuItem
								key={`include_${item}`}
								data-testid={`include-${item}`}
								onClick={() => checkIncludeItem(item)}
							>
								{tr(`dialog.import_model.include.${item}`)}
								{(checked as boolean) && (
									<i
										className="fas fa-check"
										style={{ paddingTop: 8, marginLeft: "auto" }}
									/>
								)}
							</MenuItem>
						))}
					</Menu>
				</div>
			</DialogContent>
			<DialogActions>
				<Button variant="ok" data-testid="import-ok" onClick={ok} />
			</DialogActions>
		</Dialog>
	);
}
