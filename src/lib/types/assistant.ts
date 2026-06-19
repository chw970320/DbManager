import type { DataType } from './base.js';
import type { SharedFileMappingBundleEntry } from './shared-file-mapping.js';

export type AssistantMessageRole = 'user' | 'assistant';

export interface AssistantSource {
	id: string;
	tool: string;
	title: string;
	summary: string;
	bundleId: string;
	bundleName: string;
	type?: DataType;
	filename?: string;
	count?: number;
}

export interface AssistantAction {
	id: string;
	type: 'navigate';
	label: string;
	href: string;
	description?: string;
}

export interface AssistantChatMessage {
	id: string;
	role: AssistantMessageRole;
	content: string;
	createdAt: string;
	bundleId?: string;
	sources?: AssistantSource[];
	actions?: AssistantAction[];
}

export interface AssistantChatRequestMessage {
	role: AssistantMessageRole;
	content: string;
}

export interface AssistantChatRequest {
	bundleId: string;
	messages: AssistantChatRequestMessage[];
}

export interface AssistantChatResponseData {
	message: AssistantChatMessage;
	bundle: SharedFileMappingBundleEntry;
	sources: AssistantSource[];
	actions: AssistantAction[];
}

export interface AssistantChatResponse {
	success: boolean;
	data?: AssistantChatResponseData;
	error?: string;
	message?: string;
}

export interface AssistantBundleListData {
	bundles: SharedFileMappingBundleEntry[];
	recommendedBundleId: string;
	defaultBundleId: string;
}

export interface AssistantBundleListResponse {
	success: boolean;
	data?: AssistantBundleListData;
	error?: string;
}

export interface AssistantConversation {
	bundleId: string;
	messages: AssistantChatMessage[];
	updatedAt: string;
}

export interface AssistantPersistedState {
	version: 1;
	selectedBundleId: string;
	conversations: Record<string, AssistantConversation>;
	updatedAt: string;
}
