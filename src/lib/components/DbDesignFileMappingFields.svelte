<script lang="ts">
	import {
		DB_DESIGN_DEFINITION_LABELS,
		getDbDesignSelectableTypes,
		type DbDesignDefinitionType,
		type DbDesignFileOptions,
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

	const selectableTypes = getDbDesignSelectableTypes(currentType);

	function handleChange(type: DbDesignDefinitionType, value: string) {
		mapping = {
			...mapping,
			[type]: value
		};
	}
</script>

<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
	{#each selectableTypes as type (type)}
		<div>
			<label for={`dbDesignMapping-${currentType}-${type}`} class="block text-xs font-medium text-gray-700">
				{DB_DESIGN_DEFINITION_LABELS[type]} 파일
			</label>
			<select
				id={`dbDesignMapping-${currentType}-${type}`}
				value={mapping[type] || DEFAULT_FILENAMES[type]}
				onchange={(event) =>
					handleChange(type, (event.currentTarget as HTMLSelectElement).value)}
				disabled={disabled}
				class="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
