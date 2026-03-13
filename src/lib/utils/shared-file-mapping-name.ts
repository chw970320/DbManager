import { DEFAULT_FILENAMES, type DataType } from '$lib/types/base.js';
import type { SharedFileMappingBundle } from '$lib/types/shared-file-mapping.js';

const STANDARD_GROUP_TYPES: DataType[] = ['vocabulary', 'domain', 'term'];
const DESIGN_GROUP_TYPES: DataType[] = ['database', 'entity', 'attribute', 'table', 'column'];

function stripExtension(filename: string): string {
	return filename.replace(/\.[^/.]+$/, '').trim();
}

function summarizeGroup(bundle: SharedFileMappingBundle, types: DataType[], defaultLabel: string): string {
	const filenames = types.map((type) => bundle[type]);
	const isDefaultGroup = types.every((type) => bundle[type] === DEFAULT_FILENAMES[type]);

	if (isDefaultGroup) {
		return defaultLabel;
	}

	const uniqueStems = [...new Set(filenames.map(stripExtension).filter((value) => value.length > 0))];

	if (uniqueStems.length === 0) {
		return defaultLabel;
	}

	if (uniqueStems.length === 1) {
		return uniqueStems[0];
	}

	if (uniqueStems.length === 2) {
		return `${uniqueStems[0]} + ${uniqueStems[1]}`;
	}

	return `${uniqueStems[0]} 외 ${uniqueStems.length - 1}`;
}

export function getSharedFileMappingBundleDisplayName(bundle: SharedFileMappingBundle): string {
	const standardGroup = summarizeGroup(bundle, STANDARD_GROUP_TYPES, '기본 표준용어');
	const designGroup = summarizeGroup(bundle, DESIGN_GROUP_TYPES, '기본 DB설계');

	if (standardGroup === '기본 표준용어' && designGroup === '기본 DB설계') {
		return '기본 공통 번들';
	}

	if (standardGroup === designGroup) {
		return `${standardGroup} 번들`;
	}

	if (designGroup === '기본 DB설계') {
		return `${standardGroup} + 기본 DB설계`;
	}

	if (standardGroup === '기본 표준용어') {
		return `기본 표준용어 + ${designGroup}`;
	}

	return `${standardGroup} / ${designGroup}`;
}
