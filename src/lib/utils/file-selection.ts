interface ResolvePreferredFilenameOptions {
	files: string[];
	preferredFilename?: string | null;
	currentSelection?: string | null;
	fallbackFilename: string;
}

export function resolvePreferredFilename({
	files,
	preferredFilename,
	currentSelection,
	fallbackFilename
}: ResolvePreferredFilenameOptions): string {
	if (preferredFilename && files.includes(preferredFilename)) {
		return preferredFilename;
	}

	if (currentSelection && files.includes(currentSelection)) {
		return currentSelection;
	}

	if (files.length > 0) {
		return files[0];
	}

	return fallbackFilename;
}
