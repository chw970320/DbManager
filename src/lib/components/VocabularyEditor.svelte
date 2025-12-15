<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { VocabularyEntry } from '$lib/types/vocabulary';

	interface Props {
		entry?: Partial<VocabularyEntry>;
		isEditMode?: boolean;
		serverError?: string;
	}

	let { entry = {}, isEditMode = false, serverError = '' }: Props = $props();

	const dispatch = createEventDispatcher<{
		save: VocabularyEntry;
		cancel: void;
		delete: VocabularyEntry;
	}>();

	let formData = $state({
		standardName: entry.standardName || '',
		abbreviation: entry.abbreviation || '',
		englishName: entry.englishName || '',
		description: entry.description || '',
		domainCategory: entry.domainCategory || '',
		isFormalWord: entry.isFormalWord ?? false,
		synonyms: entry.synonyms?.join(', ') || ''
	});

	let errors = $state({
		standardName: '',
		abbreviation: '',
		englishName: ''
	});

	let isSubmitting = $state(false);

	$effect(() => {
		formData.standardName = entry.standardName || '';
		formData.abbreviation = entry.abbreviation || '';
		formData.englishName = entry.englishName || '';
		formData.description = entry.description || '';
		formData.domainCategory = entry.domainCategory || '';
		formData.isFormalWord = entry.isFormalWord ?? false;
		formData.synonyms = entry.synonyms?.join(', ') || '';
	});

	function validate() {
		errors.standardName = formData.standardName.trim() ? '' : '표준단어명은 필수입니다.';
		errors.abbreviation = formData.abbreviation.trim() ? '' : '영문약어는 필수입니다.';
		errors.englishName = formData.englishName.trim() ? '' : '영문명은 필수입니다.';
		return !errors.standardName && !errors.abbreviation && !errors.englishName;
	}

	function handleSubmit() {
		if (isSubmitting) return;
		if (!validate()) return;

		isSubmitting = true;

		const now = new Date().toISOString();
		const synonyms = formData.synonyms
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);

		const editedEntry: VocabularyEntry = {
			id: entry.id || crypto.randomUUID(),
			standardName: formData.standardName.trim(),
			abbreviation: formData.abbreviation.trim(),
			englishName: formData.englishName.trim(),
			description: formData.description.trim(),
			domainCategory: formData.domainCategory.trim(),
			isFormalWord: formData.isFormalWord,
			synonyms,
			createdAt: entry.createdAt || now,
			updatedAt: now
		};

		dispatch('save', editedEntry);
		isSubmitting = false;
	}

	function handleCancel() {
		dispatch('cancel');
	}

	function handleDelete() {
		if (!entry.id) return;
		dispatch('delete', entry as VocabularyEntry);
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
	<div class="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
		<div class="flex items-center justify-between border-b px-6 py-4">
			<h2 class="text-xl font-bold text-gray-900">
				{isEditMode ? '단어 수정' : '새 단어 추가'}
			</h2>
			<button
				type="button"
				class="text-gray-500 hover:text-gray-700"
				onclick={handleCancel}
				aria-label="close"
			>
				&times;
			</button>
		</div>

		<div class="space-y-4 px-6 py-4">
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label for="standardName" class="mb-1 block text-sm font-medium text-gray-700">
						표준단어명 *
					</label>
					<input
						id="standardName"
						class="w-full rounded-lg border px-3 py-2"
						bind:value={formData.standardName}
						placeholder="예: 사용자"
					/>
					{#if errors.standardName}
						<p class="mt-1 text-sm text-red-600">{errors.standardName}</p>
					{/if}
				</div>
				<div>
					<label for="abbreviation" class="mb-1 block text-sm font-medium text-gray-700">
						영문약어 *
					</label>
					<input
						id="abbreviation"
						class="w-full rounded-lg border px-3 py-2"
						bind:value={formData.abbreviation}
						placeholder="예: user"
					/>
					{#if errors.abbreviation}
						<p class="mt-1 text-sm text-red-600">{errors.abbreviation}</p>
					{/if}
				</div>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label for="englishName" class="mb-1 block text-sm font-medium text-gray-700">
						영문명 *
					</label>
					<input
						id="englishName"
						class="w-full rounded-lg border px-3 py-2"
						bind:value={formData.englishName}
						placeholder="예: User"
					/>
					{#if errors.englishName}
						<p class="mt-1 text-sm text-red-600">{errors.englishName}</p>
					{/if}
				</div>
				<div>
					<label for="domainCategory" class="mb-1 block text-sm font-medium text-gray-700">
						도메인분류명
					</label>
					<input
						id="domainCategory"
						class="w-full rounded-lg border px-3 py-2"
						bind:value={formData.domainCategory}
						placeholder="예: 사용자관리"
					/>
				</div>
			</div>

			<div>
				<label for="description" class="mb-1 block text-sm font-medium text-gray-700">설명</label>
				<textarea
					id="description"
					class="w-full rounded-lg border px-3 py-2"
					rows="3"
					bind:value={formData.description}
					placeholder="단어 설명을 입력하세요"
				></textarea>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<div class="flex items-center space-x-2">
					<input id="isFormalWord" type="checkbox" bind:checked={formData.isFormalWord} />
					<label for="isFormalWord" class="text-sm text-gray-700">형식단어 여부</label>
				</div>
				<div>
					<label for="synonyms" class="mb-1 block text-sm font-medium text-gray-700">
						이음동의어 (쉼표 구분)
					</label>
					<input
						id="synonyms"
						class="w-full rounded-lg border px-3 py-2"
						bind:value={formData.synonyms}
						placeholder="예: 고객, 사용자"
					/>
				</div>
			</div>

			{#if serverError}
				<div class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{serverError}
				</div>
			{/if}
		</div>

		<div class="flex items-center justify-end space-x-3 border-t px-6 py-4">
			{#if isEditMode}
				<button
					type="button"
					class="rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
					onclick={handleDelete}
				>
					삭제
				</button>
			{/if}
			<button
				type="button"
				class="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
				onclick={handleCancel}
			>
				취소
			</button>
			<button
				type="button"
				class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
				disabled={isSubmitting}
				onclick={handleSubmit}
			>
				{isEditMode ? '수정' : '추가'}
			</button>
		</div>
	</div>
</div>
