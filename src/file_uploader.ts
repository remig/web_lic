/* Web Lic - Copyright (C) 2018 Remi Gagne */

export default function openFileHandler(
	acceptFileTypes: string,
	fileType: 'text' | 'dataURL',
	callback: (src: string | ArrayBuffer | null, filename: string) => void
) {
	const input = document.getElementById('openFileChooser') as HTMLInputElement;
	if (input) {
		input.onchange = function(e: Event) {
			const target = e.target as HTMLInputElement;
			const file = target?.files?.[0];
			if (target && file) {
				const reader = new FileReader();
				reader.onload = (filename => {
					return (evt: ProgressEvent) => {
						callback((evt.target as FileReader).result, filename);
					};
				})(file.name);
				if (fileType === 'text') {
					reader.readAsText(file);
				} else {
					reader.readAsDataURL(file);
				}
				target.value = '';
			}
		};
		input.setAttribute('accept', acceptFileTypes);
		input.click();
	}
}
