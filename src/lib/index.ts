// Reexport your entry components here
export { default as ScrollToTop } from './components/ScrollToTop.svelte';

// 용어집 시스템 타입 정의 export
export type {
    TerminologyEntry,
    TerminologyData,
    UploadResult,
    SearchQuery,
    SearchResult,
    ApiResponse
} from './types/terminology.js';
