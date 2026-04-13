import { pruneExpiredUploadHistories } from './upload-history-registry';

const DAY_MS = 24 * 60 * 60 * 1000;
const GLOBAL_KEY = '__dbmanager_upload_history_prune_scheduler__';

type SchedulerState = {
	started: boolean;
	timer?: ReturnType<typeof setInterval>;
};

function getGlobalState(): SchedulerState {
	const state = globalThis as typeof globalThis & {
		[GLOBAL_KEY]?: SchedulerState;
	};

	if (!state[GLOBAL_KEY]) {
		state[GLOBAL_KEY] = { started: false };
	}

	return state[GLOBAL_KEY]!;
}

async function runPrune(): Promise<void> {
	try {
		await pruneExpiredUploadHistories();
	} catch (error) {
		console.error('upload-history prune scheduler 실패:', error);
	}
}

export function startUploadHistoryPruneScheduler(): void {
	const state = getGlobalState();
	if (state.started) {
		return;
	}

	state.started = true;
	void runPrune();
	state.timer = setInterval(() => {
		void runPrune();
	}, DAY_MS);
	state.timer.unref?.();
}
