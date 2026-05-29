<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	type Props = {
		columnKey: string;
		columnLabel: string;
		currentValue?: string | null;
		options?: string[];
		isOpen?: boolean;
		onOpen?: (columnKey: string) => void;
		onClose?: () => void;
		onApply?: (value: string | null) => void;
	};

	let {
		columnKey,
		columnLabel,
		currentValue = null,
		options = [],
		isOpen: externalIsOpen = false,
		onOpen,
		onClose,
		onApply
	}: Props = $props();

	let inputValue = $state(currentValue || '');
	let filterButtonRef = $state<HTMLButtonElement | null>(null);
	let dropdownRef = $state<HTMLDivElement | null>(null);

	// 외부 클릭 감지
	function handleClickOutside(event: MouseEvent) {
		if (
			dropdownRef &&
			filterButtonRef &&
			!dropdownRef.contains(event.target as Node) &&
			!filterButtonRef.contains(event.target as Node)
		) {
			if (onClose) {
				onClose();
			}
		}
	}

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	// 필터 열기/닫기
	function toggleFilter(event: MouseEvent) {
		event.stopPropagation(); // 이벤트 전파 방지
		if (externalIsOpen) {
			// 닫기
			if (onClose) {
				onClose();
			}
		} else {
			// 열기 - 다른 필터를 먼저 닫도록 알림
			if (onOpen) {
				onOpen(columnKey);
			}
			inputValue = currentValue || '';
		}
	}

	// 필터 값 변경 시 자동 적용
	function handleValueChange(event: Event) {
		event.stopPropagation();
		const selectElement = event.target as HTMLSelectElement;
		const value =
			selectElement.value && selectElement.value.trim() ? selectElement.value.trim() : null;
		if (onApply) {
			onApply(value);
		}
		// 필터 선택 후 드롭다운 닫기
		if (onClose) {
			onClose();
		}
	}

	// 필터 활성화 여부 (props 기반 파생 상태)
	const isActive = $derived(currentValue !== null && currentValue !== '');
	const currentSelectionText = $derived(isActive ? currentValue : '전체');
</script>

<div class="relative inline-block">
	<!-- 필터 버튼 -->
	<button
		bind:this={filterButtonRef}
		type="button"
		onclick={toggleFilter}
		class="ml-1 inline-flex items-center rounded p-1 transition-colors hover:text-content-secondary focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-1 {isActive
			? 'bg-brand-50 text-brand'
			: 'text-content-muted'}"
		aria-label="{columnLabel} 필터"
		aria-expanded={externalIsOpen}
		aria-haspopup="dialog"
		aria-pressed={isActive}
		title="{columnLabel} 필터"
	>
		<Icon name="filter" size="sm" class={isActive ? 'fill-current' : ''} />
		{#if isActive}
			<span
				class="ml-1 rounded-full border border-brand bg-surface px-1 text-[10px] font-semibold leading-4 text-brand"
				aria-hidden="true"
			>
				적용
			</span>
			<span class="sr-only">필터 적용됨</span>
		{/if}
	</button>

	<!-- 필터 드롭다운 (absolute 포지셔닝, header cell 아래에 배치) -->
	{#if externalIsOpen}
		<div
			bind:this={dropdownRef}
			class="absolute right-[-10px] top-full z-50 mt-1 w-32 rounded-md border border-border bg-surface shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-label="{columnLabel} 필터"
			tabindex="-1"
		>
			<div class="p-3">
				<!-- 헤더 -->
				<div class="mb-2">
					<h4 class="text-xs font-medium text-content">{columnLabel} 필터</h4>
					<p class="mt-1 text-[11px] text-content-muted">현재 선택: {currentSelectionText}</p>
				</div>

				<!-- 선택 필드 (모든 필터를 selectbox로) -->
				<select
					bind:value={inputValue}
					onchange={handleValueChange}
					class="w-full rounded-md border border-border-strong bg-surface px-2 py-1.5 text-xs text-content focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
					onclick={(e) => e.stopPropagation()}
				>
					<option value="">전체</option>
					<!-- eslint-disable-next-line svelte/require-each-key -->
					{#each options as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>
		</div>
	{/if}
</div>
