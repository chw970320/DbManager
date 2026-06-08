<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import DatabaseEditor from './DatabaseEditor.svelte';
	import EntityEditor from './EntityEditor.svelte';
	import AttributeEditor from './AttributeEditor.svelte';
	import TableDefEditor from './TableDefEditor.svelte';
	import ColumnDefEditor from './ColumnDefEditor.svelte';
	import VocabularyEditor from './VocabularyEditor.svelte';
	import TermEditor from './TermEditor.svelte';
	import DomainEditor from './DomainEditor.svelte';
	import { DATA_TYPE_LABELS, DEFAULT_FILENAMES, type DataType } from '$lib/types/base.js';
	import type {
		AttributeEntry,
		ColumnEntry,
		DatabaseEntry,
		EntityEntry,
		TableEntry
	} from '$lib/types/database-design.js';
	import type { VocabularyEntry } from '$lib/types/vocabulary.js';
	import type { TermEntry } from '$lib/types/term.js';
	import type { DomainEntry } from '$lib/types/domain.js';
	import type { RelationResolutionTarget } from '$lib/types/design-relation.js';

	type AnyRelationEntry =
		| DatabaseEntry
		| EntityEntry
		| AttributeEntry
		| TableEntry
		| ColumnEntry
		| VocabularyEntry
		| TermEntry
		| DomainEntry;

	type ApiResponse<T> = {
		success: boolean;
		data?: T;
		error?: string;
		message?: string;
	};

	type ListResponseData = {
		entries?: AnyRelationEntry[];
		pagination?: {
			hasNextPage?: boolean;
			totalPages?: number;
		};
	};

	interface Props {
		target?: (RelationResolutionTarget & { issueId?: string }) | null;
		files?: Partial<Record<DataType, string>>;
		onclose?: () => void;
		onsaved?: (detail: {
			target: RelationResolutionTarget & { issueId?: string };
			entry: AnyRelationEntry;
			file: string;
		}) => void;
	}

	let { target = null, files = {}, onclose, onsaved }: Props = $props();

	const dispatch = createEventDispatcher<{
		close: void;
		saved: {
			target: RelationResolutionTarget & { issueId?: string };
			entry: AnyRelationEntry;
			file: string;
		};
	}>();

	let editorEntry = $state<Partial<AnyRelationEntry>>({});
	let isEditMode = $state(false);
	let serverError = $state('');
	let loading = $state(false);
	let loadedTargetKey = $state('');

	function targetFile(targetType: DataType): string {
		return files[targetType] ?? DEFAULT_FILENAMES[targetType];
	}

	function targetKey(nextTarget: RelationResolutionTarget | null | undefined): string {
		if (!nextTarget) return '';
		return [
			nextTarget.resolutionTargetId,
			nextTarget.targetType,
			nextTarget.targetId ?? '',
			nextTarget.mode,
			targetFile(nextTarget.targetType)
		].join('|');
	}

	async function loadTargetEntry(nextTarget: RelationResolutionTarget & { issueId?: string }) {
		const key = targetKey(nextTarget);
		if (key === loadedTargetKey) return;
		loadedTargetKey = key;
		serverError = '';
		isEditMode = nextTarget.mode !== 'create' && Boolean(nextTarget.targetId);
		editorEntry = { ...(nextTarget.prefill ?? {}) };

		if (!isEditMode) return;
		loading = true;
		try {
			const filename = targetFile(nextTarget.targetType);
			const pageSize = 100;
			for (let page = 1; page <= 500; page += 1) {
				const params = new URLSearchParams({
					filename,
					page: String(page),
					limit: String(pageSize)
				});
				const response = await fetch(`/api/${nextTarget.targetType}?${params.toString()}`);
				const result = (await response.json()) as ApiResponse<ListResponseData>;
				if (!response.ok || !result.success) {
					throw new Error(result.error || '수정 대상 데이터를 불러오지 못했습니다.');
				}
				const entries = result.data?.entries ?? [];
				const entry = entries.find((item) => item.id === nextTarget.targetId);
				if (entry) {
					editorEntry = { ...entry };
					return;
				}
				const pagination = result.data?.pagination;
				if (pagination?.totalPages && page >= pagination.totalPages) break;
				if (!pagination?.hasNextPage && !pagination?.totalPages) break;
			}
			throw new Error(
				`${DATA_TYPE_LABELS[nextTarget.targetType]}에서 수정 대상 항목을 찾을 수 없습니다.`
			);
		} catch (error) {
			serverError =
				error instanceof Error ? error.message : '수정 대상 데이터를 불러오지 못했습니다.';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (target) void loadTargetEntry(target);
		else {
			editorEntry = {};
			serverError = '';
			loading = false;
			loadedTargetKey = '';
		}
	});

	function close() {
		dispatch('close');
		onclose?.();
	}

	async function handleSave(entry: AnyRelationEntry) {
		if (!target) return;
		serverError = '';
		loading = true;
		try {
			const filename = targetFile(target.targetType);
			const response =
				target.targetType === 'term'
					? await fetch('/api/term', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ entry, filename, applyCascade: false })
						})
					: await fetch(`/api/${target.targetType}?filename=${encodeURIComponent(filename)}`, {
							method: isEditMode ? 'PUT' : 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify(
								target.targetType === 'domain' ? { ...entry, applyCascade: false } : entry
							)
						});
			const result = (await response.json()) as ApiResponse<AnyRelationEntry>;
			if (!response.ok || !result.success || !result.data) {
				throw new Error(result.error || '정의서 항목 저장에 실패했습니다.');
			}
			const detail = { target, entry: result.data, file: filename };
			dispatch('saved', detail);
			onsaved?.(detail);
		} catch (error) {
			serverError = error instanceof Error ? error.message : '정의서 항목 저장에 실패했습니다.';
		} finally {
			loading = false;
		}
	}
</script>

{#if target}
	{#if loading && !Object.keys(editorEntry).length}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
			<div class="rounded-lg bg-surface px-6 py-4 text-sm shadow-xl">
				{DATA_TYPE_LABELS[target.targetType]} 수정 팝업을 준비 중입니다...
			</div>
		</div>
	{:else if target.targetType === 'database'}
		<DatabaseEditor
			entry={editorEntry as Partial<DatabaseEntry>}
			{isEditMode}
			{serverError}
			on:save={(event) => void handleSave(event.detail as AnyRelationEntry)}
			on:cancel={close}
		/>
	{:else if target.targetType === 'entity'}
		<EntityEditor
			entry={editorEntry as Partial<EntityEntry>}
			{isEditMode}
			{serverError}
			on:save={(event) => void handleSave(event.detail as AnyRelationEntry)}
			on:cancel={close}
		/>
	{:else if target.targetType === 'attribute'}
		<AttributeEditor
			entry={editorEntry as Partial<AttributeEntry>}
			{isEditMode}
			{serverError}
			on:save={(event) => void handleSave(event.detail as AnyRelationEntry)}
			on:cancel={close}
		/>
	{:else if target.targetType === 'table'}
		<TableDefEditor
			entry={editorEntry as Partial<TableEntry>}
			{isEditMode}
			{serverError}
			on:save={(event) => void handleSave(event.detail as AnyRelationEntry)}
			on:cancel={close}
		/>
	{:else if target.targetType === 'column'}
		<ColumnDefEditor
			entry={editorEntry as Partial<ColumnEntry>}
			{isEditMode}
			{serverError}
			filename={targetFile('column')}
			on:save={(event) => void handleSave(event.detail as AnyRelationEntry)}
			on:cancel={close}
		/>
	{:else if target.targetType === 'vocabulary'}
		<VocabularyEditor
			entry={editorEntry as Partial<VocabularyEntry>}
			{isEditMode}
			{serverError}
			filename={targetFile('vocabulary')}
			on:save={(event) => void handleSave(event.detail as AnyRelationEntry)}
			on:cancel={close}
		/>
	{:else if target.targetType === 'term'}
		<TermEditor
			entry={editorEntry as Partial<TermEntry>}
			{isEditMode}
			{serverError}
			filename={targetFile('term')}
			on:save={(event) => void handleSave(event.detail as AnyRelationEntry)}
			on:cancel={close}
		/>
	{:else if target.targetType === 'domain'}
		<DomainEditor
			entry={editorEntry as Partial<DomainEntry>}
			{isEditMode}
			{serverError}
			filename={targetFile('domain')}
			on:save={(event) => void handleSave(event.detail as AnyRelationEntry)}
			on:cancel={close}
		/>
	{/if}
{/if}
