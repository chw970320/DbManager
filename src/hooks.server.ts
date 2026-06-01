import type { ServerInit } from '@sveltejs/kit';
import { ensureFileMappingMigrated } from '$lib/registry/shared-file-mapping-registry';
import { startUploadHistoryPruneScheduler } from '$lib/registry/upload-history-scheduler';

export const init: ServerInit = async () => {
	await ensureFileMappingMigrated();
	startUploadHistoryPruneScheduler();
};
