<script lang="ts">
	import { onMount } from 'svelte';

	type FilterType = 'text' | 'select';

	type Props = {
		columnKey: string;
		columnLabel: string;
		filterType?: FilterType;
		currentValue?: string | null;
		options?: string[];
		isOpen?: boolean;
		onOpen?: (columnKey: string) => void;
		onClose?: () => void;
		onApply?: (value: string | null) => void;
		onClear?: () => void;
	};

	let {
		columnKey,
		columnLabel,
		filterType: _filterType = 'text',
		currentValue = null,
		options = [],
		isOpen: externalIsOpen = false,
		onOpen,
		onClose,
		onApply,
		onClear
	}: Props = $props();

	// 현재는 필터 타입별 분기 처리가 없지만, API 호환성을 위해 props로 유지
	void _filterType;

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
</script>

<div class="relative inline-block">
	<!-- 필터 버튼 -->
	<button
		bind:this={filterButtonRef}
		type="button"
		onclick={toggleFilter}
		class="ml-1 inline-flex items-center rounded p-1 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 {isActive
			? 'text-blue-600'
			: 'text-gray-400'}"
		aria-label="{columnLabel} 필터"
		title="{columnLabel} 필터"
	>
		<svg
			class="h-4 w-4"
			fill={isActive ? 'currentColor' : 'none'}
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
			/>
		</svg>
	</button>

	<!-- 필터 드롭다운 (absolute 포지셔닝, header cell 아래에 배치) -->
	{#if externalIsOpen}
		<div
			bind:this={dropdownRef}
			class="absolute right-[-10px] top-full z-50 mt-1 w-32 rounded-md border border-gray-300 bg-white shadow-lg"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-label="{columnLabel} 필터"
			tabindex="-1"
		>
			<div class="p-3">
				<!-- 헤더 -->
				<div class="mb-2">
					<h4 class="text-xs font-medium text-gray-900">{columnLabel} 필터</h4>
				</div>

				<!-- 선택 필드 (모든 필터를 selectbox로) -->
				<select
					bind:value={inputValue}
					onchange={handleValueChange}
					class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
