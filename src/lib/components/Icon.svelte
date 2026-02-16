<script lang="ts">
	interface Props {
		name: string;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		class?: string;
	}

	let { name, size = 'md', class: className = '' }: Props = $props();

	const sizeMap: Record<string, string> = {
		xs: 'h-3 w-3',
		sm: 'h-4 w-4',
		md: 'h-5 w-5',
		lg: 'h-6 w-6',
		xl: 'h-12 w-12'
	};

	const sizeClass = $derived(sizeMap[size] || sizeMap.md);

	type IconDef = {
		paths?: string[];
		circles?: Array<{ cx: string; cy: string; r: string }>;
		rects?: Array<{ x: string; y: string; width: string; height: string; rx?: string }>;
		polylines?: string[];
		lines?: Array<{ x1: string; y1: string; x2: string; y2: string }>;
		fill?: string;
	};

	const icons: Record<string, IconDef> = {
		search: {
			paths: [
				'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
			]
		},
		x: {
			paths: ['M6 18L18 6M6 6l12 12']
		},
		'x-circle': {
			paths: [
				'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
			]
		},
		check: {
			paths: ['M5 13l4 4L19 7']
		},
		'check-circle': {
			paths: [
				'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
			]
		},
		'chevron-down': {
			paths: ['M19 9l-7 7-7-7']
		},
		'chevron-right': {
			paths: ['M9 5l7 7-7 7']
		},
		'chevron-up': {
			paths: ['M5 15l7-7 7 7']
		},
		'arrow-up': {
			paths: ['M5 10l7-7m0 0l7 7m-7-7v18']
		},
		plus: {
			paths: ['M12 4v16m8-8H4']
		},
		minus: {
			paths: ['M20 12H4']
		},
		trash: {
			paths: [
				'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
			]
		},
		edit: {
			paths: [
				'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
			]
		},
		upload: {
			paths: [
				'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
			]
		},
		download: {
			paths: [
				'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10'
			]
		},
		file: {
			paths: [
				'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
			]
		},
		folder: {
			paths: [
				'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
			]
		},
		warning: {
			paths: [
				'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
			]
		},
		info: {
			paths: [
				'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
			]
		},
		refresh: {
			paths: [
				'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
			]
		},
		'external-link': {
			paths: [
				'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
			]
		},
		copy: {
			paths: [
				'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
			]
		},
		filter: {
			paths: ['M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z']
		},
		database: {
			paths: [
				'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4'
			]
		},
		table: {
			paths: [
				'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
			]
		},
		columns: {
			paths: [
				'M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2'
			]
		},
		cube: {
			paths: [
				'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4'
			]
		},
		key: {
			paths: [
				'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z'
			]
		},
		tag: {
			paths: [
				'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z'
			]
		},
		server: {
			paths: [
				'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01'
			]
		},
		diagram: {
			paths: [
				'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
			]
		},
		menu: {
			paths: ['M4 6h16M4 12h16m-7 6h7']
		},
		spinner: {
			paths: [],
			circles: [{ cx: '12', cy: '12', r: '10' }]
		},
		'dots-vertical': {
			paths: [
				'M12 5v.01M12 12v.01M12 19v.01'
			]
		},
		save: {
			paths: [
				'M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4'
			]
		},
		link: {
			paths: [
				'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
			]
		}
	};

	const icon = $derived(icons[name]);
</script>

{#if name === 'spinner'}
	<svg
		class="{sizeClass} animate-spin {className}"
		xmlns="http://www.w3.org/2000/svg"
		fill="none"
		viewBox="0 0 24 24"
		aria-hidden="true"
	>
		<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
		></circle>
		<path
			class="opacity-75"
			fill="currentColor"
			d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
		></path>
	</svg>
{:else if icon}
	<svg
		class="{sizeClass} {className}"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		{#each icon.paths || [] as d}
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" {d}></path>
		{/each}
		{#each icon.circles || [] as circle}
			<circle
				cx={circle.cx}
				cy={circle.cy}
				r={circle.r}
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
			></circle>
		{/each}
		{#each icon.polylines || [] as points}
			<polyline stroke-linecap="round" stroke-linejoin="round" stroke-width="2" {points}
			></polyline>
		{/each}
		{#each icon.lines || [] as line}
			<line
				x1={line.x1}
				y1={line.y1}
				x2={line.x2}
				y2={line.y2}
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
			></line>
		{/each}
	</svg>
{:else}
	<span class="{sizeClass} inline-block" aria-hidden="true">?</span>
{/if}
