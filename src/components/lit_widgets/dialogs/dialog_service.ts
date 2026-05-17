// Maps each dialog ID to the args its factory requires at creation time.
export type DialogArgs = {
	'hello-world': [title: string];
};

type DialogId = keyof DialogArgs;

const registry = new Map<DialogId, (...args: any[]) => () => void>();

export const DialogService = {
	register<K extends DialogId>(id: K, factory: (...args: DialogArgs[K]) => () => void) {
		registry.set(id, factory);
	},
	unregister(id: DialogId) {
		registry.delete(id);
	},
	create<K extends DialogId>(id: K, ...args: DialogArgs[K]): {open(): void} {
		const opener = registry.get(id)!(...args);
		return {open: opener};
	},
};
