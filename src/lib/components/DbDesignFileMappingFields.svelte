<script lang="ts">
	import {
		DB_DESIGN_DEFINITION_LABELS,
		getDbDesignSelectableTypeGroups,
		type DbDesignDefinitionType,
		type DbDesignFileOptions,
		type DbDesignSelectableTypeGroup,
		type DbDesignRelatedMapping
	} from '$lib/utils/db-design-file-mapping';
	import { DEFAULT_FILENAMES } from '$lib/types/base';

	let {
		currentType,
		mapping = $bindable({}),
		fileOptions = {},
		disabled = false
	}: {
		currentType: DbDesignDefinitionType;
		mapping?: DbDesignRelatedMapping;
		fileOptions?: DbDesignFileOptions;
		disabled?: boolean;
	} = $props();

	const categoryStyles: Record<
		DbDesignSelectableTypeGroup['key'],
		{ surface: string; heading: string }
	> = {
		'standard-terms': {
			surface: 'border-emerald-200/80 bg-emerald-50/40',
			heading: 'text-emerald-800'
		},
		'db-design': {
			surface: 'border-sky-200/80 bg-sky-50/40',
			heading: 'text-sky-800'
		}
	};

	let selectableTypeGroups = $derived(getDbDesignSelectableTypeGroups(currentType));

	function handleChange(type: DbDesignDefinitionType, value: string) {
		mapping = {
			...mapping,
			[type]: value
		};
	}
</script>

<div class="space-y-4">
	{#each selectableTypeGroups as group (group.key)}
		<div class="rounded-2xl border p-4 {categoryStyles[group.key].surface}">
			<div class="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h4 class="text-sm font-semibold {categoryStyles[group.key].heading}">{group.label}</h4>
					<p class="mt-1 text-xs text-slate-600">{group.description}</p>
				</div>
				<span class="rounded-full border border-white/80 bg-white px-2.5 py-1 text-xs text-slate-500">
					{group.types.length}개 항목
				</span>
			</div>

			<div class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				{#each group.types as type (type)}
					<div class="rounded-xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/40">
						<div>
							<label
								for={`dbDesignMapping-${currentType}-${type}`}
								class="block text-xs font-semibold text-slate-700"
							>
								{DB_DESIGN_DEFINITION_LABELS[type]} 파일
							</label>
						</div>
						<select
							id={`dbDesignMapping-${currentType}-${type}`}
							value={mapping[type] || DEFAULT_FILENAMES[type]}
							onchange={(event) =>
								handleChange(type, (event.currentTarget as HTMLSelectElement).value)}
							disabled={disabled}
							class="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
						>
							{#if !fileOptions[type] || fileOptions[type]?.length === 0}
								<option value={DEFAULT_FILENAMES[type]}>{DEFAULT_FILENAMES[type]}</option>
							{:else}
								{#each fileOptions[type] as file (file)}
									<option value={file}>{file}</option>
								{/each}
							{/if}
						</select>
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>
