import type { EditorSaveImpactPreview } from '$lib/types/change-impact.js';
import {
	classifyEditorSaveImpact,
	type EditorSaveImpactStatusKind
} from '$lib/utils/cascade-update-rules.js';

export type EditorSaveImpactStatusPresentation = {
	kind: EditorSaveImpactStatusKind;
	label: string;
	dialogTitle: string;
	dialogDescription: string;
	summaryTitle: string;
	summaryDescription: string;
	icon: 'warning' | 'info' | 'check-circle';
	iconClass: string;
	iconWrapClass: string;
	panelClass: string;
	badgeClass: string;
	textClass: string;
};

const statusPresentation: Record<EditorSaveImpactStatusKind, EditorSaveImpactStatusPresentation> = {
	blocked: {
		kind: 'blocked',
		label: '저장 차단',
		dialogTitle: '충돌 해결 후 저장할 수 있습니다.',
		dialogDescription: '자동 반영 충돌이 있어 저장 전에 후보나 원본 데이터를 먼저 정리해야 합니다.',
		summaryTitle: '충돌 해결 필요',
		summaryDescription: '충돌 항목이 있어 저장 전에 후보나 원본 데이터를 정리해야 합니다.',
		icon: 'warning',
		iconClass: 'text-status-error',
		iconWrapClass: 'bg-status-error-bg',
		panelClass: 'border-status-error-border bg-status-error-bg',
		badgeClass: 'badge-error',
		textClass: 'text-status-error'
	},
	related: {
		kind: 'related',
		label: '검토 필요',
		dialogTitle: '연관 파일이 함께 변경됩니다.',
		dialogDescription:
			'저장하면 아래 연관 파일에도 자동 반영됩니다. 대상 파일과 샘플을 확인한 뒤 진행하세요.',
		summaryTitle: '연관 자동 반영 예정',
		summaryDescription: '원본 저장과 함께 연관 파일 변경이 계산되었습니다.',
		icon: 'info',
		iconClass: 'text-status-warning',
		iconWrapClass: 'bg-status-warning-bg',
		panelClass: 'border-status-warning-border bg-status-warning-bg',
		badgeClass: 'badge-warning',
		textClass: 'text-status-warning'
	},
	source: {
		kind: 'source',
		label: '원본 변경',
		dialogTitle: '원본 항목만 저장됩니다.',
		dialogDescription: '연관 자동 반영 없이 원본 파일의 변경만 저장됩니다.',
		summaryTitle: '원본 파일 변경',
		summaryDescription: '연관 자동 반영 없이 원본 항목 변경만 계산되었습니다.',
		icon: 'info',
		iconClass: 'text-status-info',
		iconWrapClass: 'bg-status-info-bg',
		panelClass: 'border-status-info-border bg-status-info-bg',
		badgeClass: 'badge-info',
		textClass: 'text-status-info'
	},
	neutral: {
		kind: 'neutral',
		label: '영향 없음',
		dialogTitle: '연관 변경 없이 저장할 수 있습니다.',
		dialogDescription: '현재 미리보기 기준으로 연관 파일 변경이나 충돌이 없습니다.',
		summaryTitle: '추가 영향 없음',
		summaryDescription: '현재 입력값 기준으로 연관 변경이나 충돌이 없습니다.',
		icon: 'check-circle',
		iconClass: 'text-status-success',
		iconWrapClass: 'bg-status-success-bg',
		panelClass: 'border-status-success-border bg-status-success-bg',
		badgeClass: 'badge-success',
		textClass: 'text-status-success'
	}
};

export function getEditorSaveImpactStatus(
	preview: Pick<EditorSaveImpactPreview, 'blocked' | 'summary'>
): EditorSaveImpactStatusPresentation {
	return statusPresentation[classifyEditorSaveImpact(preview)];
}
