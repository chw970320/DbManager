<script lang="ts">
	type PageChangeEvent = { page: number };
	type PageToken = number | 'ellipsis';

	let {
		currentPage = 1,
		totalPages = 1,
		loading = false,
		onpagechange
	}: {
		currentPage?: number;
		totalPages?: number;
		loading?: boolean;
		onpagechange?: (detail: PageChangeEvent) => void;
	} = $props();

	let displayedPages = $derived(getPageNumbers(currentPage, totalPages));

	function getPageNumbers(page: number, pageCount: number): PageToken[] {
		const pages: PageToken[] = [];
		const maxVisible = 7;

		if (pageCount <= maxVisible) {
			for (let i = 1; i <= pageCount; i++) pages.push(i);
			return pages;
		}

		pages.push(1);
		if (page <= 4) {
			for (let i = 2; i <= 5; i++) pages.push(i);
			pages.push('ellipsis', pageCount);
		} else if (page >= pageCount - 3) {
			pages.push('ellipsis');
			for (let i = pageCount - 4; i <= pageCount; i++) pages.push(i);
		} else {
			pages.push('ellipsis');
			for (let i = page - 1; i <= page + 1; i++) pages.push(i);
			pages.push('ellipsis', pageCount);
		}

		return pages;
	}

	function handlePageChange(page: number) {
		if (!loading && page !== currentPage && page >= 1 && page <= totalPages) {
			onpagechange?.({ page });
		}
	}
</script>

{#if totalPages > 1}
	<div
		class="flex flex-col items-center justify-between space-y-4 border-t border-border px-6 py-4 md:flex-row md:space-y-0"
	>
		<div class="text-sm text-content-muted">
			총 <span class="font-medium">{totalPages}</span> 페이지 중
			<span class="font-medium">{currentPage}</span> 페이지
		</div>

		<nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
			<button
				type="button"
				onclick={() => handlePageChange(currentPage - 1)}
				disabled={currentPage === 1 || loading}
				class="relative inline-flex items-center rounded-l-md px-2 py-2 text-content-muted ring-1 ring-inset ring-border transition-colors hover:bg-surface-muted focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<span class="sr-only">이전</span>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>

			{#each displayedPages as page, i (typeof page === 'number' ? page : `ellipsis-${i}`)}
				{#if typeof page === 'number'}
					<button
						type="button"
						onclick={() => handlePageChange(page)}
						disabled={loading}
						aria-current={currentPage === page ? 'page' : undefined}
						class="relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-border transition-colors focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50 {currentPage ===
						page
							? 'z-10 bg-brand text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand'
							: 'text-content hover:bg-surface-muted'}"
					>
						{page}
					</button>
				{:else}
					<span
						class="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-content-secondary ring-1 ring-inset ring-border"
					>
						...
					</span>
				{/if}
			{/each}

			<button
				type="button"
				onclick={() => handlePageChange(currentPage + 1)}
				disabled={currentPage === totalPages || loading}
				class="relative inline-flex items-center rounded-r-md px-2 py-2 text-content-muted ring-1 ring-inset ring-border transition-colors hover:bg-surface-muted focus:z-20 focus:outline-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<span class="sr-only">다음</span>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</nav>
	</div>
{/if}
