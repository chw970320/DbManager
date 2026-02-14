/// <reference types="@sveltejs/kit" />
/// <reference types="@testing-library/jest-dom" />
import type { VocabularyData as VocabularyDataType } from '$lib/types/vocabulary';
import type {
	SearchQuery as SearchQueryType,
	SearchResult as SearchResultType
} from '$lib/types/vocabulary';
import type {
	DbDesignApiResponse as DbDesignApiResponseType,
	DatabaseData as DatabaseDataType,
	DatabaseEntry as DatabaseEntryType,
	EntityData as EntityDataType,
	EntityEntry as EntityEntryType,
	AttributeData as AttributeDataType,
	AttributeEntry as AttributeEntryType,
	TableData as TableDataType,
	TableEntry as TableEntryType,
	ColumnData as ColumnDataType,
	ColumnEntry as ColumnEntryType
} from '$lib/types/database-design';
import type { TermData as TermDataType, TermEntry as TermEntryType } from '$lib/types/term';
import type {
	ValidationErrorType as ValidationErrorTypeType,
	ValidationError as ValidationErrorTypeAlias,
	AutoFixSuggestion as AutoFixSuggestionType,
	ValidationResult as ValidationResultType
} from '$lib/types/term';
import type {
	DomainData as DomainDataType,
	DomainEntry as DomainEntryType,
	DomainApiResponse as DomainApiResponseType
} from '$lib/types/domain';
import type { VocabularyEntry as VocabularyEntryType } from '$lib/types/vocabulary';
import type { DataType as DataTypeType } from '$lib/types/base';

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	type ApiResponse = {
		success: boolean;
		data?: unknown;
		error?: string;
		message?: string;
	};

	type VocabularyData = VocabularyDataType;
	type VocabularyEntry = VocabularyEntryType;
	type SearchQuery = SearchQueryType;
	type SearchResult = SearchResultType;
	type DomainData = DomainDataType;
	type DomainEntry = DomainEntryType;
	type DomainApiResponse<T = unknown> = DomainApiResponseType<T>;
	type TermData = TermDataType;
	type TermEntry = TermEntryType;
	type ValidationErrorType = ValidationErrorTypeType;
	type ValidationError = ValidationErrorTypeAlias;
	type AutoFixSuggestion = AutoFixSuggestionType;
	type ValidationResult = ValidationResultType;
	type DataType = DataTypeType;
	type DbDesignApiResponse<T = unknown> = DbDesignApiResponseType<T>;
	type DatabaseData = DatabaseDataType;
	type DatabaseEntry = DatabaseEntryType;
	type EntityData = EntityDataType;
	type EntityEntry = EntityEntryType;
	type AttributeData = AttributeDataType;
	type AttributeEntry = AttributeEntryType;
	type TableData = TableDataType;
	type TableEntry = TableEntryType;
	type ColumnData = ColumnDataType;
	type ColumnEntry = ColumnEntryType;
}

declare module 'svelte-copy-to-clipboard' {
	import type { SvelteComponent } from 'svelte';
	export default class CopyToClipboard extends SvelteComponent {}
}

export {};
