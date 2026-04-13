import type { ServerInit } from '@sveltejs/kit';
import { startUploadHistoryPruneScheduler } from '$lib/registry/upload-history-scheduler';

export const init: ServerInit = async () => {
	startUploadHistoryPruneScheduler();
};
