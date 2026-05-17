/* Web Lic - Copyright (C) 2018 Remi Gagne */

import Storage from "../storage";

const builtInFamilyNames = ["Helvetica", "Times New Roman"];
const customFamilyNames: string[] = Storage.get.customFonts();

export function getFamilyNames(): { label: string; options: string[] }[] {
	if (customFamilyNames.length) {
		return [
			{ label: "builtInFonts", options: builtInFamilyNames },
			{ label: "customFonts", options: customFamilyNames },
			{ label: "custom", options: ["Custom..."] },
		];
	}
	return [
		{ label: "builtInFonts", options: builtInFamilyNames },
		{ label: "customFonts", options: ["Custom..."] },
	];
}

export function addCustomFont(family: string): void {
	if (!family) {
		return;
	}
	const familyLower = family.toLowerCase();
	const existing = [
		...builtInFamilyNames.map((f) => f.toLowerCase()),
		...customFamilyNames.map((f) => f.toLowerCase()),
	];
	if (!existing.includes(familyLower)) {
		customFamilyNames.push(family);
		Storage.replace.customFonts(customFamilyNames);
	}
}
