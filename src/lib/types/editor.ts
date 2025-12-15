/**
 * 공통 에디터 관련 타입 정의
 * Editor 컴포넌트들의 공통 Props 및 이벤트 타입
 */

// ============================================================================
// 공통 이벤트 타입
// ============================================================================

export interface EditorSaveEvent<T> {
	entry: T;
}

export interface EditorDeleteEvent<T> {
	entry: T;
}

// ============================================================================
// 공통 Props 인터페이스
// ============================================================================

export interface EditorProps<T> {
	entry?: Partial<T>;
	isEditMode?: boolean;
	serverError?: string;
	onsave?: (detail: EditorSaveEvent<T>) => void;
	oncancel?: () => void;
	ondelete?: (detail: EditorDeleteEvent<T>) => void;
}

// ============================================================================
// 폼 필드 정의
// ============================================================================

export interface FormFieldDefinition {
	key: string;
	label: string;
	type: 'text' | 'textarea' | 'select' | 'checkbox' | 'autocomplete';
	required?: boolean;
	placeholder?: string;
	maxLength?: number;
	options?: Array<{ value: string; label: string }>;
}

// ============================================================================
// 유효성 검사
// ============================================================================

export interface ValidationError {
	field: string;
	message: string;
}

export interface ValidationResult {
	isValid: boolean;
	errors: ValidationError[];
}

export function validateRequired(
	value: string | undefined,
	fieldName: string
): ValidationError | null {
	if (!value || value.trim() === '') {
		return { field: fieldName, message: `${fieldName}은(는) 필수 항목입니다.` };
	}
	return null;
}

export function validateMaxLength(
	value: string | undefined,
	fieldName: string,
	maxLength: number
): ValidationError | null {
	if (value && value.length > maxLength) {
		return { field: fieldName, message: `${fieldName}은(는) ${maxLength}자를 초과할 수 없습니다.` };
	}
	return null;
}
