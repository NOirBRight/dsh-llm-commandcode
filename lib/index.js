import z from "@deepseek-ai/schemastery";
import { INVALID_CREDENTIAL_CODE, LlmAdapter, LlmError, ReasoningEffortId, RetryPolicySchema, assertUsableApiKey, attributionHeaders, normalizeApiKey, resolveRetryPolicy } from "@deepseek-ai/dsh-llm";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { deepEqualJson } from "@deepseek-ai/dsh-util-values";
import { MAX_TIMER_DELAY_MS } from "@deepseek-ai/dsh-timeout";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import { createProvider } from "@earendil-works/pi-ai";
import { anthropicMessagesApi } from "@earendil-works/pi-ai/api/anthropic-messages.lazy";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
//#region lib/types/numbers.js
/** Browser-safe numeric domain predicates shared by config and wire decoders. */
function isPositiveInteger(value) {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function positiveInteger(value) {
	return isPositiveInteger(value) ? value : void 0;
}
//#endregion
//#region lib/types/reasoning-catalog.js
/** Browser-safe effort catalog extracted from official command-code@1.44.0. */
const ALL = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
const FOUR = [
	"low",
	"medium",
	"high",
	"xhigh"
];
const THREE = [
	"low",
	"medium",
	"high"
];
const HIGH_MAX = ["high", "max"];
const LOW_HIGH_MAX = [
	"low",
	"high",
	"max"
];
const LOW_MEDIUM_XHIGH = [
	"low",
	"medium",
	"xhigh"
];
/** Exact model ids and reasoningEfforts from the published official CLI model table. */
const OFFICIAL_EFFORTS = {
	"claude-sonnet-5": ALL,
	"claude-sonnet-4-6": ALL,
	"claude-fable-5-1": ALL,
	"claude-fable-5": ALL,
	"claude-opus-5": ALL,
	"claude-opus-4-8": ALL,
	"claude-opus-4-7": ALL,
	"claude-haiku-4-5-20251001": ALL,
	"gpt-5.6-sol": ALL,
	"gpt-5.6-terra": ALL,
	"gpt-5.6-luna": ALL,
	"gpt-5.5": FOUR,
	"gpt-5.4": FOUR,
	"gpt-5.3-codex": FOUR,
	"gpt-5.4-mini": THREE,
	"deepseek/deepseek-v4-pro": HIGH_MAX,
	"deepseek/deepseek-v4-flash": HIGH_MAX,
	"deepseek/deepseek-v4-flash-vision-exp": HIGH_MAX,
	"deepseek/deepseek-v4-flash-fast": LOW_HIGH_MAX,
	"moonshotai/kimi-k3": LOW_HIGH_MAX,
	"moonshotai/kimi-k2.7-code": LOW_HIGH_MAX,
	"moonshotai/kimi-k2.7-code-highspeed": LOW_HIGH_MAX,
	"moonshotai/kimi-k2.6": LOW_HIGH_MAX,
	"moonshotai/kimi-k2.5": LOW_HIGH_MAX,
	"z-ai/glm-5.3-flash": LOW_HIGH_MAX,
	"zai-org/glm-5.3": LOW_HIGH_MAX,
	"zai-org/glm-5.2": HIGH_MAX,
	"minimax/minimax-m2.7-free": LOW_MEDIUM_XHIGH,
	"minimaxai/minimax-m2.5": LOW_MEDIUM_XHIGH,
	"xiaomi/mimo-v2.5-pro": LOW_MEDIUM_XHIGH,
	"xiaomi/mimo-v2.5": LOW_MEDIUM_XHIGH,
	"qwen/qwen3.8-max": LOW_MEDIUM_XHIGH,
	"qwen/qwen3.8-max-0902": LOW_MEDIUM_XHIGH,
	"qwen/qwen3.8-27b": LOW_MEDIUM_XHIGH,
	"qwen/qwen3.8-flash": LOW_MEDIUM_XHIGH,
	"stepfun/step-3.7-flash": THREE,
	"stepfun/step-3.5-flash": THREE,
	"tencent/hy3": THREE,
	"tencent/hy3-paid": THREE,
	"google/gemini-3.7-flash": THREE,
	"google/gemini-3.8-flash": THREE,
	"google/gemini-3.6-flash": THREE,
	"google/gemini-3.5-flash": THREE,
	"google/gemini-3.5-flash-lite": THREE,
	"google/gemini-3.1-flash-lite": THREE,
	"sakana/fugu-ultra": ["high", "xhigh"],
	"meta/muse-spark-1.1": FOUR,
	"meta/muse-spark-1.2": FOUR,
	"meta/muse-spark-1.2-contributor": FOUR,
	"xai/grok-4.5": THREE,
	"xai/grok-4.6": FOUR,
	"tencent/hy4-preview": THREE,
	"meta/muse-spark-1.3": ALL,
	"meta/muse-spark-1.3-contributor": ALL
};
/** Explicit deployment defaults aligned with local Ollama/OpenCode/Codex policy. */
const DEFAULT_EFFORTS = {
	"z-ai/glm-5.3-flash": "max",
	"zai-org/glm-5.3": "max",
	"zai-org/glm-5.2": "max",
	"claude-fable-5-1": "high",
	"moonshotai/kimi-k3": "high",
	"qwen/qwen3.8-max-0902": "xhigh",
	"gpt-5.6-sol": "high",
	"gpt-5.6-terra": "xhigh",
	"gpt-5.6-luna": "max"
};
const EFFORT_RANK = [
	"low",
	"medium",
	"high",
	"xhigh",
	"max"
];
function highestEffort(efforts) {
	return [...EFFORT_RANK].reverse().find((effort) => efforts.includes(effort)) ?? efforts.at(-1);
}
/** Return a valid explicit default; every model with efforts gets one. */
function defaultEffortForCommandCodeModel(model) {
	const efforts = effortsForCommandCodeModel(model);
	if (efforts.length === 0) return void 0;
	if (model.defaultEffort !== void 0 && efforts.includes(model.defaultEffort)) return model.defaultEffort;
	const key = model.id.toLowerCase();
	if (key.startsWith("deepseek/")) return efforts.includes("max") ? "max" : highestEffort(efforts);
	if (key.startsWith("meta/muse-")) return highestEffort(efforts);
	const preferred = DEFAULT_EFFORTS[key] ?? (key.startsWith("gpt-") ? "xhigh" : void 0);
	if (preferred !== void 0 && efforts.includes(preferred)) return preferred;
	return efforts.includes("high") ? "high" : efforts.includes("medium") ? "medium" : highestEffort(efforts);
}
const EFFORT_LABELS = {
	low: "Low",
	medium: "Medium",
	high: "High",
	xhigh: "Extra high",
	max: "Max"
};
function effortsForCommandCodeModel(model) {
	return OFFICIAL_EFFORTS[model.id.toLowerCase()] ?? [];
}
//#endregion
//#region lib/types/client-contract.js
/** Browser-safe constants and JSON decoders for the Command Code plugin. */
const COMMANDCODE_SETTINGS_NAMESPACE = "llm-commandcode";
const COMMANDCODE_PROVIDER = "commandcode";
const DEFAULT_API_KEY_ENV = "COMMANDCODE_API_KEY";
const PUBLIC_PROVIDER_BASE_URL = "https://api.commandcode.ai/provider/v1";
const DEFAULT_CONTEXT_WINDOW = 1e6;
const DEFAULT_MAX_TOKENS = 32768;
const DEFAULT_REQUEST_TIMEOUT_MS = 6e4;
const DEFAULT_STREAM_IDLE_TIMEOUT_MS = 3e5;
const COMMANDCODE_RPC_CHANNEL = "/commandcode";
const COMMANDCODE_SETTINGS_READ_ENDPOINT = "settings/read";
const COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT = "credentials/status";
const COMMANDCODE_CREDENTIAL_SET_ENDPOINT = "credentials/set";
function record$2(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
const TOKEN_FIELD = /^(?:accessToken|refreshToken|access_token|refresh_token|id_token|idToken|token|apiKey|api_key|value)$/iu;
function hasTokenFields(value) {
	return Object.keys(value).some((key) => TOKEN_FIELD.test(key));
}
function optionalPositiveInteger(value) {
	return value === void 0 || isPositiveInteger(value);
}
/** Decode one model while preserving only known JSON fields. */
function decodeCommandCodeModel(value) {
	if (!record$2(value) || hasTokenFields(value) || typeof value.id !== "string" || value.id.length === 0) return void 0;
	if (value.name !== void 0 && typeof value.name !== "string") return void 0;
	if (value.description !== void 0 && typeof value.description !== "string") return void 0;
	if (!optionalPositiveInteger(value.contextWindow)) return void 0;
	if (!optionalPositiveInteger(value.contextWindowOverride)) return void 0;
	if (!optionalPositiveInteger(value.maxTokens)) return void 0;
	if (value.reasoningEfforts !== void 0) return void 0;
	if (value.thinking !== void 0 && typeof value.thinking !== "boolean") return void 0;
	const thinking = value.thinking;
	const rawEffort = thinking === false ? void 0 : value.defaultEffort;
	if (rawEffort !== void 0) {
		if (typeof rawEffort !== "string" || rawEffort.length === 0) return void 0;
		if (!effortsForCommandCodeModel({ id: value.id }).includes(rawEffort)) return void 0;
	}
	let modalities;
	if (value.inputModalities !== void 0) {
		if (!Array.isArray(value.inputModalities)) return void 0;
		const normalized = value.inputModalities.length === 0 ? ["text"] : value.inputModalities;
		if (normalized.some((item) => item !== "text" && item !== "image")) return void 0;
		if (new Set(normalized).size !== normalized.length) return void 0;
		modalities = [...normalized];
	}
	return {
		id: value.id,
		...value.name === void 0 ? {} : { name: value.name },
		...value.description === void 0 ? {} : { description: value.description },
		...value.contextWindow === void 0 ? {} : { contextWindow: value.contextWindow },
		...value.contextWindowOverride === void 0 ? {} : { contextWindowOverride: value.contextWindowOverride },
		...value.maxTokens === void 0 ? {} : { maxTokens: value.maxTokens },
		...thinking === void 0 ? {} : { thinking },
		...rawEffort === void 0 ? {} : { defaultEffort: rawEffort },
		...modalities === void 0 ? {} : { inputModalities: modalities }
	};
}
function decodeCommandCodeSettings(value) {
	if (!record$2(value) || hasTokenFields(value)) return void 0;
	const modelsValue = value.models;
	if (typeof value.apiKeyEnv !== "string" || value.apiKeyEnv.length === 0) return void 0;
	if (!Array.isArray(modelsValue)) return void 0;
	if (!isPositiveInteger(value.defaultContextWindow) || !isPositiveInteger(value.defaultMaxTokens)) return void 0;
	if (!isPositiveInteger(value.requestTimeoutMs) || !isPositiveInteger(value.streamIdleTimeoutMs)) return void 0;
	if (typeof value.zeroDataRetention !== "boolean" || typeof value.usageEnabled !== "boolean") return void 0;
	const models = [];
	const ids = /* @__PURE__ */ new Set();
	for (const item of modelsValue) {
		const model = decodeCommandCodeModel(item);
		if (model === void 0 || ids.has(model.id)) return void 0;
		ids.add(model.id);
		models.push(model);
	}
	return {
		apiKeyEnv: value.apiKeyEnv,
		models,
		defaultContextWindow: value.defaultContextWindow,
		defaultMaxTokens: value.defaultMaxTokens,
		requestTimeoutMs: value.requestTimeoutMs,
		streamIdleTimeoutMs: value.streamIdleTimeoutMs,
		zeroDataRetention: value.zeroDataRetention,
		usageEnabled: value.usageEnabled
	};
}
function decodeCommandCodeDiscoveryRequest(value) {
	if (!record$2(value) || Object.keys(value).length !== 0) return void 0;
	return {};
}
function decodeCommandCodeDiscoveryResult(value) {
	if (!record$2(value) || hasTokenFields(value) || !Array.isArray(value.models) || !Array.isArray(value.warnings)) return void 0;
	const models = [];
	for (const item of value.models) {
		const model = decodeCommandCodeModel(item);
		if (model === void 0) return void 0;
		models.push(model);
	}
	if (value.warnings.some((item) => typeof item !== "string")) return void 0;
	return {
		models,
		warnings: [...value.warnings]
	};
}
function decodeCommandCodeSaveRequest(value) {
	if (!record$2(value) || hasTokenFields(value)) return void 0;
	const expectedRevision = value.expectedRevision;
	if (typeof expectedRevision !== "number" || !Number.isSafeInteger(expectedRevision) || expectedRevision < 0) return void 0;
	const settings = value.settings;
	if (!record$2(settings)) return void 0;
	const decoded = decodeCommandCodeSettings({
		apiKeyEnv: DEFAULT_API_KEY_ENV,
		...settings
	});
	if (decoded === void 0) return void 0;
	const { apiKeyEnv: _apiKeyEnv, ...withoutKey } = decoded;
	return {
		settings: withoutKey,
		expectedRevision
	};
}
function decodeCommandCodeSaveResult(value) {
	if (!record$2(value) || hasTokenFields(value)) return void 0;
	const revision = value.revision;
	if (!Number.isSafeInteger(revision) || revision < 0) return void 0;
	const settings = decodeCommandCodeSettings(value.settings);
	return settings === void 0 ? void 0 : {
		settings,
		revision
	};
}
function decodeUsageWindow(value) {
	if (!record$2(value) || !positiveOrZero(value.used) || !positiveOrZero(value.cap)) return void 0;
	if (value.exceeded !== void 0 && typeof value.exceeded !== "boolean") return void 0;
	if (value.resetAt !== void 0 && typeof value.resetAt !== "string") return void 0;
	return {
		used: value.used,
		cap: value.cap,
		...value.exceeded === void 0 ? {} : { exceeded: value.exceeded },
		...value.resetAt === void 0 ? {} : { resetAt: value.resetAt }
	};
}
function positiveOrZero(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
/** Decode the secret-free usage snapshot returned by the Host. */
function decodeCommandCodeSettingsReadResult(value) {
	if (!record$2(value) || hasTokenFields(value) || !record$2(value.credential)) return void 0;
	const base = decodeCommandCodeSaveResult(value);
	if (base === void 0 || typeof value.credential.configured !== "boolean" || typeof value.credential.writable !== "boolean") return void 0;
	return {
		...base,
		credential: {
			configured: value.credential.configured,
			writable: value.credential.writable
		}
	};
}
function decodeCommandCodeCredentialSetRequest(value) {
	if (!record$2(value) || Object.keys(value).some((key) => key !== "apiKey") || typeof value.apiKey !== "string" || value.apiKey.trim().length === 0) return void 0;
	return { apiKey: value.apiKey };
}
function decodeCommandCodeUsageView(value) {
	if (!record$2(value) || hasTokenFields(value) || typeof value.fetchedAt !== "string" || !Array.isArray(value.failures)) return void 0;
	if (value.failures.some((item) => typeof item !== "string")) return void 0;
	const usage = {
		fetchedAt: value.fetchedAt,
		failures: [...value.failures]
	};
	if (value.account !== void 0) {
		if (!record$2(value.account)) return void 0;
		if (value.account.name !== void 0 && typeof value.account.name !== "string") return void 0;
		if (value.account.userName !== void 0 && typeof value.account.userName !== "string") return void 0;
		usage.account = {
			...value.account.name === void 0 ? {} : { name: value.account.name },
			...value.account.userName === void 0 ? {} : { userName: value.account.userName }
		};
	}
	if (value.credits !== void 0) {
		if (!record$2(value.credits)) return void 0;
		const credits = value.credits;
		const monthlyCredits = credits.monthlyCredits;
		const purchasedCredits = credits.purchasedCredits;
		const freeCredits = credits.freeCredits;
		if (!positiveOrZero(monthlyCredits) && monthlyCredits !== void 0) return void 0;
		if (!positiveOrZero(purchasedCredits) && purchasedCredits !== void 0) return void 0;
		if (!positiveOrZero(freeCredits) && freeCredits !== void 0) return void 0;
		const decodedCredits = {
			...monthlyCredits === void 0 ? {} : { monthlyCredits },
			...purchasedCredits === void 0 ? {} : { purchasedCredits },
			...freeCredits === void 0 ? {} : { freeCredits }
		};
		for (const key of ["fiveHour", "weekly"]) if (credits[key] !== void 0) {
			const window = decodeUsageWindow(credits[key]);
			if (window === void 0) return void 0;
			decodedCredits[key] = window;
		}
		usage.credits = decodedCredits;
	}
	if (value.plan !== void 0) {
		if (!record$2(value.plan)) return void 0;
		for (const key of [
			"planId",
			"name",
			"status",
			"currentPeriodEnd"
		]) if (value.plan[key] !== void 0 && typeof value.plan[key] !== "string") return void 0;
		const planId = value.plan.planId;
		const planName = value.plan.name;
		const planStatus = value.plan.status;
		const periodEnd = value.plan.currentPeriodEnd;
		usage.plan = {
			...planId === void 0 ? {} : { planId },
			...planName === void 0 ? {} : { name: planName },
			...planStatus === void 0 ? {} : { status: planStatus },
			...periodEnd === void 0 ? {} : { currentPeriodEnd: periodEnd }
		};
	}
	if (value.summary !== void 0) {
		if (!record$2(value.summary)) return void 0;
		for (const key of [
			"totalCost",
			"totalTokensIn",
			"totalTokensOut",
			"totalCount",
			"completedCount",
			"failedCount"
		]) if (value.summary[key] !== void 0 && !positiveOrZero(value.summary[key])) return void 0;
		usage.summary = {};
		for (const key of [
			"totalCost",
			"totalTokensIn",
			"totalTokensOut",
			"totalCount",
			"completedCount",
			"failedCount"
		]) if (value.summary[key] !== void 0) usage.summary[key] = value.summary[key];
	}
	return usage;
}
function decodeCommandCodeUsageReply(value) {
	if (!record$2(value) || value.status !== "ok" && value.status !== "unsupported") return void 0;
	if (value.status === "unsupported") return { status: "unsupported" };
	const usage = decodeCommandCodeUsageView(value.usage);
	return usage === void 0 ? void 0 : {
		status: "ok",
		usage
	};
}
function decodeCommandCodeUsageRequest(value) {
	return record$2(value) ? {} : void 0;
}
//#endregion
//#region lib/types/capability-catalog.js
/** Current Command Code model capabilities that the public model endpoint omits. */
const IMAGE_MODELS = /* @__PURE__ */ new Set([
	"claude-sonnet-5",
	"claude-sonnet-4-6",
	"claude-fable-5-1",
	"claude-fable-5",
	"claude-opus-5",
	"claude-opus-4-8",
	"claude-opus-4-7",
	"claude-haiku-4-5-20251001",
	"gpt-5.6-sol",
	"gpt-5.6-terra",
	"gpt-5.6-luna",
	"gpt-5.5",
	"gpt-5.4",
	"gpt-5.3-codex",
	"gpt-5.4-mini",
	"deepseek/deepseek-v4-flash-vision-exp",
	"moonshotai/kimi-k3",
	"moonshotai/kimi-k2.7-code",
	"moonshotai/kimi-k2.7-code-highspeed",
	"moonshotai/kimi-k2.6",
	"moonshotai/kimi-k2.5",
	"z-ai/glm-5.3-flash",
	"minimaxai/minimax-m3",
	"minimax/minimax-m3-free",
	"xiaomi/mimo-v2.5",
	"qwen/qwen3.8-max-0902",
	"qwen/qwen3.8-max",
	"qwen/qwen3.8-27b",
	"qwen/qwen3.8-flash",
	"qwen/qwen3.7-plus",
	"qwen/qwen3.7-flash",
	"qwen/qwen3.6-plus",
	"stepfun/step-3.7-flash",
	"google/gemini-3.8-flash",
	"google/gemini-3.7-flash",
	"google/gemini-3.6-flash",
	"google/gemini-3.5-flash",
	"google/gemini-3.5-flash-lite",
	"google/gemini-3.1-flash-lite",
	"sakana/fugu-ultra",
	"thinkingmachines/inkling",
	"thinkingmachines/inkling-small",
	"meta/muse-spark-1.1",
	"meta/muse-spark-1.2",
	"meta/muse-spark-1.2-contributor",
	"meta/muse-spark-1.3",
	"meta/muse-spark-1.3-contributor",
	"xai/grok-4.5"
]);
const NATIVE_REASONING_MODELS = /* @__PURE__ */ new Set(["meituan/longcat-2.0:free"]);
/** Return the provider-advertised text/image input modalities for one id. */
function inputModalitiesForCommandCodeModel(id) {
	return IMAGE_MODELS.has(id.toLowerCase()) ? ["text", "image"] : ["text"];
}
/** Whether a model reasons by provider default without exposing a selector. */
function hasNativeReasoningByDefault(id) {
	return NATIVE_REASONING_MODELS.has(id.toLowerCase());
}
//#endregion
//#region lib/types/types.js
/** Resolve the model's effective context without rounding or guessing first. */
function effectiveContext(model, fallback) {
	return model.contextWindowOverride ?? model.contextWindow ?? fallback;
}
/** Resolve the model's wire protocol. */
function effectiveApi(model) {
	return model.id.toLowerCase().startsWith("claude-") ? "anthropic-messages" : "openai-completions";
}
//#endregion
//#region lib/types/pi-ai-profile.js
/** Mixed OpenAI/Anthropic pi-ai profile for the Command Code Provider API. */
const NO_COST = {
	input: 0,
	output: 0,
	cacheRead: 0,
	cacheWrite: 0
};
const DEFAULT_MAX_REQUEST_IMAGE_BYTES = 20971520;
function providerAuth() {
	return { apiKey: {
		name: "Command Code API key",
		resolve: ({ credential }) => Promise.resolve({
			auth: credential?.key === void 0 ? {} : { apiKey: credential.key },
			source: "Command Code"
		})
	} };
}
/** Anthropic SDK appends /v1/messages; the shared Command Code URL already ends in /v1. */
function anthropicBaseURL(providerBaseURL) {
	const normalized = providerBaseURL.replace(/\/+$/u, "");
	return normalized.endsWith("/v1") ? normalized.slice(0, -3) : normalized;
}
function thinkingLevelMap(model) {
	if (model.thinking === false) return void 0;
	const efforts = effortsForCommandCodeModel(model);
	if (efforts.length === 0) return void 0;
	return Object.fromEntries(efforts.map((effort) => [effort, effort]));
}
/** Build one pi-ai model whose api field selects the mixed provider implementation. */
function toCommandCodePiAiModel(model, connection) {
	const api = effectiveApi(model);
	const levels = thinkingLevelMap(model);
	const reasoning = levels !== void 0;
	return {
		id: model.id,
		name: model.name ?? model.id,
		api,
		provider: COMMANDCODE_PROVIDER,
		baseUrl: api === "anthropic-messages" ? anthropicBaseURL(connection.providerBaseURL) : connection.providerBaseURL,
		reasoning,
		...levels === void 0 ? {} : { thinkingLevelMap: levels },
		input: model.inputModalities === void 0 ? inputModalitiesForCommandCodeModel(model.id) : [...model.inputModalities],
		cost: NO_COST,
		contextWindow: effectiveContext(model, connection.defaultContextWindow),
		maxTokens: model.maxTokens ?? connection.defaultMaxTokens,
		compat: api === "openai-completions" ? {
			supportsStore: false,
			supportsDeveloperRole: false,
			supportsReasoningEffort: reasoning,
			supportsUsageInStreaming: true,
			maxTokensField: "max_tokens",
			thinkingFormat: "openai"
		} : {
			forceAdaptiveThinking: reasoning,
			supportsEagerToolInputStreaming: true,
			supportsCacheControlOnTools: true,
			supportsStrictTools: false
		}
	};
}
/** Build the complete mixed-protocol profile for one immutable options snapshot. */
function createCommandCodePiAiProfile(connection) {
	const models = connection.models.map((model) => toCommandCodePiAiModel(model, connection));
	const configuredMaxTokens = /* @__PURE__ */ new Map();
	for (const model of connection.models) if (model.maxTokens !== void 0) configuredMaxTokens.set(model.id, model.maxTokens);
	const piProvider = createProvider({
		id: COMMANDCODE_PROVIDER,
		name: "Command Code",
		baseUrl: connection.providerBaseURL,
		...connection.zeroDataRetention ? { headers: { "x-cmd-zdr": "1" } } : {},
		auth: providerAuth(),
		models,
		api: {
			"openai-completions": openAICompletionsApi(),
			"anthropic-messages": anthropicMessagesApi()
		}
	});
	return {
		provider: COMMANDCODE_PROVIDER,
		displayName: "Command Code",
		apiKeyEnv: connection.apiKeyEnv,
		baseURL: connection.providerBaseURL,
		defaultContextWindow: connection.defaultContextWindow,
		defaultMaxTokens: connection.defaultMaxTokens,
		defaultInput: ["text"],
		streamIdleTimeoutMs: connection.streamIdleTimeoutMs,
		maxRequestImageBytes: DEFAULT_MAX_REQUEST_IMAGE_BYTES,
		requestImagePixelBudget: 4194304,
		requestImageMaxBytes: 1048576,
		retryPolicy: connection.retryPolicy,
		piProvider,
		configuredMaxTokens
	};
}
//#endregion
//#region lib/types/pi-ai-auth.js
/** In-memory auth services required by the delegated PiAiAdapter. */
function createCommandCodePiAiAuth() {
	const stored = /* @__PURE__ */ new Map();
	return {
		credentials: {
			read: (providerId) => Promise.resolve(stored.get(providerId)),
			list: () => Promise.resolve([...stored].map(([providerId, credential]) => ({
				providerId,
				type: credential.type
			}))),
			async modify(providerId, mutate) {
				const next = await mutate(stored.get(providerId));
				if (next !== void 0) stored.set(providerId, next);
				return stored.get(providerId);
			},
			delete: (providerId) => {
				stored.delete(providerId);
				return Promise.resolve();
			}
		},
		authContext: {
			env: () => Promise.resolve(void 0),
			fileExists: () => Promise.resolve(false)
		}
	};
}
//#endregion
//#region lib/types/reasoning.js
/** Host-side projection of Command Code effort metadata into the DSH model seam. */
function applyCommandCodeReasoningMetadata(info, model) {
	if (model.thinking === false) return info;
	const efforts = effortsForCommandCodeModel(model);
	if (efforts.length === 0) return info;
	const resolvedDefault = defaultEffortForCommandCodeModel(model);
	const defaultEffort = resolvedDefault === void 0 ? void 0 : ReasoningEffortId(resolvedDefault);
	return {
		...info,
		reasoning: {
			efforts: efforts.map((id) => ({
				id: ReasoningEffortId(id),
				name: EFFORT_LABELS[id] ?? id
			})),
			...defaultEffort === void 0 ? {} : { defaultEffort }
		}
	};
}
//#endregion
//#region lib/types/adapter.js
/** Command Code adapter delegated to DSH's mixed-protocol PiAiAdapter. */
function configuredModel(connection, id) {
	return connection.models.find((model) => model.id === id);
}
function classifyCommandCodeError(chunk) {
	if (chunk.type !== "finish" || chunk.reason.kind !== "error") return chunk;
	const message = chunk.reason.failure.message;
	const code = /cmd_zdr_no_providers/iu.test(message) ? "ZDR_UNAVAILABLE" : /upgrade_required/iu.test(message) ? "PROVIDER_FORBIDDEN" : /unsupported_model|not supported on this endpoint/iu.test(message) ? "INVALID_REQUEST" : void 0;
	if (code === void 0) return chunk;
	return {
		...chunk,
		reason: {
			...chunk.reason,
			failure: {
				...chunk.reason.failure,
				code
			}
		}
	};
}
const SANDBOX_MODE_RANK = {
	"read-only": 0,
	"workspace-write": 1,
	"danger-full-access": 2
};
/**
* Remove sandbox escalation choices that cannot be strictly wider than the
* current DSH policy. Core still validates every retained request; this only
* prevents Codex from selecting an impossible optional enum value.
*/
function narrowCommandCodeEscalationSchemas(options) {
	const mode = sandboxModeOf(options);
	const currentRank = mode === void 0 ? void 0 : SANDBOX_MODE_RANK[mode];
	if (currentRank === void 0 || options.tools === void 0) return options;
	let changed = false;
	const tools = options.tools.map((tool) => {
		const parameters = tool.parameters;
		const properties = isRecord(parameters.properties) ? parameters.properties : void 0;
		const permission = properties === void 0 || !isRecord(properties.sandbox_permissions) ? void 0 : properties.sandbox_permissions;
		if (permission === void 0 || !Array.isArray(permission.enum)) return tool;
		const wider = permission.enum.filter((candidate) => {
			return typeof candidate === "string" && (SANDBOX_MODE_RANK[candidate] ?? -1) > currentRank;
		});
		if (wider.length === permission.enum.length) return tool;
		changed = true;
		const nextProperties = { ...properties };
		if (wider.length === 0) {
			delete nextProperties.sandbox_permissions;
			delete nextProperties.justification;
		} else nextProperties.sandbox_permissions = {
			...permission,
			enum: wider
		};
		const required = Array.isArray(parameters.required) ? parameters.required.filter((name) => name !== "sandbox_permissions" && name !== "justification") : void 0;
		return {
			...tool,
			parameters: {
				...parameters,
				properties: nextProperties,
				...required === void 0 ? {} : { required }
			}
		};
	});
	return changed ? {
		...options,
		tools
	} : options;
}
function sandboxModeOf(options) {
	for (let index = options.messages.length - 1; index >= 0; index -= 1) {
		const message = options.messages[index];
		if (!isRecord(message)) continue;
		const found = sandboxModeIn(message.content);
		if (found !== void 0) return found;
	}
	return sandboxModeIn(options.system);
}
function sandboxModeIn(value) {
	if (typeof value === "string") return /Current DSH file policy:\s*(read-only|workspace-write|danger-full-access)\./u.exec(value)?.[1];
	if (Array.isArray(value)) {
		for (const item of value) {
			const found = sandboxModeIn(item);
			if (found !== void 0) return found;
		}
		return;
	}
	if (!isRecord(value)) return void 0;
	return sandboxModeIn(value.text) ?? sandboxModeIn(value.content);
}
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
/** One DSH provider route backed by a pi-ai provider with per-model api dispatch. */
var CommandCodeAdapter = class extends LlmAdapter {
	config;
	auth = createCommandCodePiAiAuth();
	snapshot;
	constructor(config) {
		super();
		this.config = config;
	}
	current() {
		const options = this.config.options();
		if (this.snapshot?.options === options) return this.snapshot.adapter;
		const profile = createCommandCodePiAiProfile(options);
		const profiles = /* @__PURE__ */ new Map([[COMMANDCODE_PROVIDER, profile]]);
		const adapter = new PiAiAdapter({
			profiles: () => profiles,
			resolveApiKey: () => this.config.resolveApiKey(options),
			auth: this.auth,
			...this.config.resolveAttachments === void 0 ? {} : { resolveAttachments: this.config.resolveAttachments }
		});
		this.snapshot = {
			options,
			adapter
		};
		return adapter;
	}
	providerInfo(provider) {
		return this.current().providerInfo(provider);
	}
	providerRetryPolicy(provider) {
		return this.current().providerRetryPolicy(provider);
	}
	/**
	* Declare neutral request-image pricing so the Host uses heuristic image pricing.
	* @param _provider - provider route.
	* @param _model - model id.
	* @returns `undefined` so the Host uses heuristic image pricing.
	*/
	imageRequestPricing(_provider, _model) {}
	listModels(provider) {
		return this.current().listModels(provider);
	}
	async resolveModel(provider, model, signal) {
		const info = await this.current().resolveModel(provider, model, signal);
		const configured = configuredModel(this.config.options(), model);
		return configured === void 0 ? info : applyCommandCodeReasoningMetadata(info, configured);
	}
	async *stream(options) {
		for await (const chunk of this.current().stream(narrowCommandCodeEscalationSchemas(options))) yield classifyCommandCodeError(chunk);
	}
	async prepareCall(provider, model, signal) {
		const prepared = await this.current().prepareCall(provider, model, signal);
		const configured = configuredModel(this.config.options(), model);
		return {
			model: configured === void 0 ? prepared.model : applyCommandCodeReasoningMetadata(prepared.model, configured),
			stream: async function* (options) {
				for await (const chunk of prepared.stream(narrowCommandCodeEscalationSchemas(options))) yield classifyCommandCodeError(chunk);
			}
		};
	}
};
//#endregion
//#region lib/types/http.js
/** Byte-limited response-body reading shared by provider and account calls. */
/** Read a response as UTF-8 without buffering more than maxBytes. */
async function readBoundedText(response, maxBytes, label, code, signal) {
	const declared = Number(response.headers.get("content-length") ?? NaN);
	if (Number.isFinite(declared) && declared > maxBytes) {
		await response.body?.cancel();
		throw new LlmError(label + " returned an oversized response", code);
	}
	if (response.body === null) return "";
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let bytes = 0;
	let text = "";
	const cancelReader = () => {
		reader.cancel();
	};
	signal?.addEventListener("abort", cancelReader, { once: true });
	try {
		for (;;) {
			signal?.throwIfAborted();
			const result = await reader.read();
			if (result.done) break;
			bytes += result.value.byteLength;
			if (bytes > maxBytes) {
				await reader.cancel();
				throw new LlmError(label + " returned an oversized response", code);
			}
			text += decoder.decode(result.value, { stream: true });
		}
		text += decoder.decode();
		return text;
	} finally {
		signal?.removeEventListener("abort", cancelReader);
		reader.releaseLock();
	}
}
//#endregion
//#region lib/types/discovery.js
/** Live Command Code model catalog discovery. */
const MAX_DISCOVERY_BYTES = 4194304;
const DISCOVERY_TIMEOUT_MS = 3e4;
function record$1(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmpty(value) {
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
function protocolForModel(id) {
	return effectiveApi({ id });
}
/** Parse the provider's OpenAI-shaped model list without inventing capacity. */
function parseCommandCodeModels(value) {
	const data = record$1(value) ? value.data : void 0;
	if (!Array.isArray(data)) throw new LlmError("Command Code model listing has no data array", "DISCOVERY_FAILED");
	const models = [];
	const warnings = [];
	const seen = /* @__PURE__ */ new Set();
	for (const raw of data) {
		if (!record$1(raw)) continue;
		const entry = raw;
		const id = nonEmpty(entry.id);
		if (id === void 0 || seen.has(id)) continue;
		seen.add(id);
		const contextWindow = positiveInteger(entry.context_length);
		if (contextWindow === void 0) warnings.push(id + " has no valid context_length");
		const maxTokens = positiveInteger(entry.max_output_tokens) ?? positiveInteger(entry.max_tokens);
		const name = nonEmpty(entry.name);
		const defaultEffort = defaultEffortForCommandCodeModel({ id });
		models.push({
			id,
			...name === void 0 ? {} : { name },
			...contextWindow === void 0 ? {} : { contextWindow },
			...maxTokens === void 0 ? {} : { maxTokens },
			...defaultEffort === void 0 ? {} : { defaultEffort },
			...hasNativeReasoningByDefault(id) ? { thinking: true } : {},
			inputModalities: inputModalitiesForCommandCodeModel(id)
		});
	}
	return {
		models,
		warnings
	};
}
function listingURL() {
	return PUBLIC_PROVIDER_BASE_URL + "/models";
}
/** Fetch the current public model catalog. */
async function discoverModels(request = {}, fetchImpl = fetch) {
	const url = listingURL();
	const timeout = AbortSignal.timeout(DISCOVERY_TIMEOUT_MS);
	const signal = request.signal === void 0 ? timeout : AbortSignal.any([request.signal, timeout]);
	let response;
	try {
		response = await fetchImpl(url, {
			method: "GET",
			headers: {
				accept: "application/json",
				...attributionHeaders()
			},
			redirect: "error",
			signal
		});
	} catch (error) {
		if (request.signal?.aborted) throw new LlmError("Command Code model discovery aborted", "ABORTED", { cause: error });
		throw new LlmError("Could not reach Command Code model catalog", "DISCOVERY_FAILED", { cause: error });
	}
	if (!response.ok) {
		await response.body?.cancel();
		throw new LlmError("Command Code model catalog answered HTTP " + String(response.status), response.status === 401 ? INVALID_CREDENTIAL_CODE : "DISCOVERY_FAILED", { status: response.status });
	}
	let body;
	try {
		body = JSON.parse(await readBoundedText(response, MAX_DISCOVERY_BYTES, url, "DISCOVERY_FAILED", signal));
	} catch (error) {
		if (error instanceof LlmError) throw error;
		throw new LlmError("Command Code model catalog did not return JSON", "DISCOVERY_FAILED", { cause: error });
	}
	return parseCommandCodeModels(body);
}
//#endregion
//#region lib/types/usage.js
/** Host-only Command Code account credit and quota reporting. */
const USAGE_TIMEOUT_MS = 15e3;
const USAGE_FAILED = "COMMANDCODE_USAGE_FAILED";
const MAX_USAGE_BYTES = 2097152;
const ACCOUNT_API_BASE_URL = "https://api.commandcode.ai";
function record(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function numberValue(value) {
	return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : void 0;
}
function stringValue(value) {
	return typeof value === "string" && value.length > 0 ? value : void 0;
}
function nestedRecord(value, key) {
	if (!record(value)) return void 0;
	return record(value[key]) ? value[key] : void 0;
}
function asEpoch(value) {
	if (typeof value === "number" && Number.isFinite(value) && value > 0) {
		const ms = value < 0xe8d4a51000 ? value * 1e3 : value;
		const date = new Date(ms);
		return Number.isNaN(date.getTime()) ? void 0 : date.toISOString();
	}
	if (typeof value === "string" && value.length > 0) {
		const time = Date.parse(value);
		return Number.isNaN(time) ? void 0 : new Date(time).toISOString();
	}
}
function query(path, params) {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) if (value !== void 0) search.set(key, value);
	const encoded = search.toString();
	return encoded.length === 0 ? path : path + "?" + encoded;
}
function usableKey(raw) {
	const checked = normalizeApiKey(raw);
	if (checked.ok) return checked.value;
	throw new LlmError(checked.reason === "empty" ? "Command Code API key is blank" : "Command Code API key contains invalid header characters", INVALID_CREDENTIAL_CODE);
}
function unwrapData(body) {
	let value = body;
	for (let index = 0; index < 3; index += 1) {
		if (!record(value.data)) break;
		value = value.data;
	}
	return value;
}
function parseWindow(value) {
	if (!record(value)) return void 0;
	const used = numberValue(value.used ?? value.usage ?? value.consumed);
	const cap = numberValue(value.cap ?? value.limit ?? value.total);
	if (used === void 0 || cap === void 0) return void 0;
	const resetAt = asEpoch(value.resetAt ?? value.reset_at ?? value.resetsAt ?? value.resets_at ?? value.reset);
	return {
		used,
		cap,
		...typeof value.exceeded === "boolean" ? { exceeded: value.exceeded } : {},
		...resetAt === void 0 ? {} : { resetAt }
	};
}
function parseCredits(body) {
	const root = unwrapData(body);
	const credits = nestedRecord(root, "credits") ?? root;
	const windowRoot = nestedRecord(root, "windowLimits") ?? nestedRecord(credits, "windowLimits");
	const fiveHour = parseWindow(windowRoot?.fiveHour ?? windowRoot?.five_hour);
	const weekly = parseWindow(windowRoot?.weekly);
	const monthlyCredits = numberValue(credits.monthlyCredits);
	const purchasedCredits = numberValue(credits.purchasedCredits);
	const freeCredits = numberValue(credits.freeCredits);
	const result = {
		...monthlyCredits === void 0 ? {} : { monthlyCredits },
		...purchasedCredits === void 0 ? {} : { purchasedCredits },
		...freeCredits === void 0 ? {} : { freeCredits },
		...fiveHour === void 0 ? {} : { fiveHour },
		...weekly === void 0 ? {} : { weekly }
	};
	return Object.keys(result).length === 0 ? void 0 : result;
}
const PLAN_NAMES = {
	"individual-go": "Go",
	"individual-goat": "GOAT",
	"individual-pro": "Pro",
	"individual-pro-v1": "Pro",
	"individual-provider": "Provider",
	"individual-max": "Max",
	"individual-ultra": "Ultra",
	"teams-pro": "Teams Pro"
};
function planName(planId) {
	if (planId === void 0) return void 0;
	const key = Object.keys(PLAN_NAMES).sort((a, b) => b.length - a.length).find((item) => planId.toLowerCase().startsWith(item));
	return key === void 0 ? planId : PLAN_NAMES[key];
}
function parsePlan(body) {
	const value = unwrapData(body);
	const credits = nestedRecord(value, "credits");
	const planId = stringValue(value.planId) ?? stringValue(credits?.planId);
	const name = stringValue(value.planName) ?? stringValue(value.name) ?? planName(planId);
	const status = stringValue(value.status);
	const currentPeriodEnd = asEpoch(value.currentPeriodEnd ?? value.current_period_end);
	if (planId === void 0 && name === void 0 && status === void 0 && currentPeriodEnd === void 0) return void 0;
	return {
		...planId === void 0 ? {} : { planId },
		...name === void 0 ? {} : { name },
		...status === void 0 ? {} : { status },
		...currentPeriodEnd === void 0 ? {} : { currentPeriodEnd }
	};
}
function parseSummary(body) {
	const value = unwrapData(body);
	const aliases = {
		totalCost: ["totalCost", "total_cost"],
		totalTokensIn: [
			"totalTokensIn",
			"total_tokens_in",
			"inputTokens"
		],
		totalTokensOut: [
			"totalTokensOut",
			"total_tokens_out",
			"outputTokens"
		],
		totalCount: ["totalCount", "total_count"],
		completedCount: ["completedCount", "completed_count"],
		failedCount: ["failedCount", "failed_count"]
	};
	const result = {};
	for (const key of Object.keys(aliases)) {
		const valueForKey = aliases[key].map((alias) => numberValue(value[alias])).find((item) => item !== void 0);
		if (valueForKey !== void 0) result[key] = valueForKey;
	}
	return Object.keys(result).length === 0 ? void 0 : result;
}
function parseAccount(body) {
	const user = nestedRecord(body, "user") ?? nestedRecord(unwrapData(body), "user");
	if (user === void 0) return void 0;
	const name = stringValue(user.name);
	const userName = stringValue(user.userName) ?? stringValue(user.username);
	if (name === void 0 && userName === void 0) return void 0;
	return {
		...name === void 0 ? {} : { name },
		...userName === void 0 ? {} : { userName }
	};
}
function orgId(body) {
	return stringValue((nestedRecord(body, "org") ?? nestedRecord(unwrapData(body), "org"))?.id);
}
function periodStart(body) {
	const value = unwrapData(body);
	return asEpoch(value.currentPeriodStart ?? value.current_period_start);
}
async function fetchJSON(url, apiKey, signal, fetchImpl) {
	const timeout = AbortSignal.timeout(USAGE_TIMEOUT_MS);
	const combined = signal === void 0 ? timeout : AbortSignal.any([signal, timeout]);
	const response = await fetchImpl(url, {
		method: "GET",
		headers: {
			accept: "application/json",
			authorization: "Bearer " + apiKey,
			...attributionHeaders()
		},
		redirect: "error",
		signal: combined
	});
	if (!response.ok) {
		await response.body?.cancel();
		return {
			body: {},
			status: response.status
		};
	}
	let parsed;
	try {
		parsed = JSON.parse(await readBoundedText(response, MAX_USAGE_BYTES, url, USAGE_FAILED, combined));
	} catch (error) {
		if (error instanceof LlmError) throw error;
		throw new LlmError("Command Code usage endpoint did not return JSON", USAGE_FAILED, { cause: error });
	}
	if (!record(parsed)) throw new LlmError("Command Code usage endpoint returned a non-object response", USAGE_FAILED);
	return {
		body: parsed,
		status: response.status
	};
}
/** Parse a report from endpoint bodies; exported for deterministic unit tests. */
function parseCommandCodeUsageBodies(input) {
	const view = {
		fetchedAt: input.now ?? (/* @__PURE__ */ new Date()).toISOString(),
		failures: [...input.failures ?? []]
	};
	if (input.whoami !== void 0) {
		const account = parseAccount(input.whoami);
		if (account !== void 0) view.account = account;
	}
	if (input.credits !== void 0) {
		const credits = parseCredits(input.credits);
		if (credits !== void 0) view.credits = credits;
	}
	const plan = input.subscription === void 0 ? input.credits === void 0 ? void 0 : parsePlan(input.credits) : parsePlan(input.subscription);
	if (plan !== void 0) view.plan = plan;
	if (input.summary !== void 0) {
		const summary = parseSummary(input.summary);
		if (summary !== void 0) view.summary = summary;
	}
	return view;
}
/** Query account credits and rolling quota windows without making a model call. */
async function readCommandCodeUsage(request, resolveCredential, fetchImpl = fetch) {
	const supplied = await resolveCredential();
	if (supplied === void 0 || supplied.trim().length === 0) throw new LlmError("Command Code usage requires a configured API key", "MISSING_CREDENTIAL");
	const apiKey = usableKey(supplied);
	const base = ACCOUNT_API_BASE_URL;
	const failures = [];
	const statuses = [];
	const get = async (path) => {
		try {
			const result = await fetchJSON(base + path, apiKey, request.signal, fetchImpl);
			if (result.status < 200 || result.status >= 300) {
				statuses.push(result.status);
				failures.push(path + ": HTTP " + String(result.status));
				return;
			}
			return result.body;
		} catch (error) {
			if (request.signal?.aborted) throw new LlmError("Command Code usage read aborted", "ABORTED", { cause: error });
			if (error instanceof LlmError && error.code === "COMMANDCODE_USAGE_FAILED") failures.push(path + ": " + error.message);
			else failures.push(path + ": network error");
			return;
		}
	};
	const whoami = await get("/alpha/whoami");
	const id = whoami === void 0 ? void 0 : orgId(whoami);
	const [credits, subscription] = await Promise.all([get(query("/alpha/billing/credits", { orgId: id })), get(query("/alpha/billing/subscriptions", { orgId: id }))]);
	const summary = await get(query("/alpha/usage/summary", {
		orgId: id,
		since: subscription === void 0 ? void 0 : periodStart(subscription)
	}));
	const view = parseCommandCodeUsageBodies({
		...whoami === void 0 ? {} : { whoami },
		...credits === void 0 ? {} : { credits },
		...subscription === void 0 ? {} : { subscription },
		...summary === void 0 ? {} : { summary },
		failures
	});
	if (!(view.account !== void 0 || view.credits !== void 0 || view.plan !== void 0 || view.summary !== void 0) && statuses.length > 0 && statuses.every((status) => status === 404)) return { status: "unsupported" };
	return {
		status: "ok",
		usage: view
	};
}
//#endregion
//#region lib/types/index.js
/** Command Code plugin entry: route registration, settings, discovery, and quota RPC. */
const name = "llm-commandcode";
const inject = ["llm"];
const NS = COMMANDCODE_SETTINGS_NAMESPACE;
const DEFAULT_RETRY_POLICY = {
	mode: "normal",
	maxRetries: 3
};
/** No fabricated startup capacities: a model enters the route only after live discovery or explicit config. */
const DEFAULT_MODELS = [];
const MODEL_MODALITIES = ["text", "image"];
const catalogModel = z.object({
	id: z.string().required(),
	name: z.string(),
	description: z.string(),
	contextWindow: z.number().step(1).min(1),
	contextWindowOverride: z.number().step(1).min(1),
	maxTokens: z.number().step(1).min(1),
	thinking: z.boolean(),
	defaultEffort: z.string(),
	inputModalities: z.array(z.union(MODEL_MODALITIES))
});
const Config = z.object({
	apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_ENV),
	models: z.array(catalogModel).default(DEFAULT_MODELS),
	defaultContextWindow: z.number().step(1).min(1).default(DEFAULT_CONTEXT_WINDOW),
	defaultMaxTokens: z.number().step(1).min(1).max(Number.MAX_SAFE_INTEGER).default(DEFAULT_MAX_TOKENS),
	requestTimeoutMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_REQUEST_TIMEOUT_MS),
	streamIdleTimeoutMs: z.number().step(1).min(1).max(MAX_TIMER_DELAY_MS).default(DEFAULT_STREAM_IDLE_TIMEOUT_MS),
	zeroDataRetention: z.boolean().default(false),
	usageEnabled: z.boolean().default(true),
	retryPolicy: RetryPolicySchema
});
function resolveModels(models) {
	const seen = /* @__PURE__ */ new Set();
	return [...models ?? DEFAULT_MODELS].map((model) => {
		if (model.id.length === 0) throw new Error("llm-commandcode: model ids must be non-empty");
		if (seen.has(model.id)) throw new Error("llm-commandcode: duplicate model id " + model.id);
		seen.add(model.id);
		if (model.contextWindow !== void 0 && !isPositiveInteger(model.contextWindow)) throw new Error("llm-commandcode: invalid contextWindow for " + model.id);
		if (model.contextWindowOverride !== void 0 && !isPositiveInteger(model.contextWindowOverride)) throw new Error("llm-commandcode: invalid contextWindowOverride for " + model.id);
		if (model.maxTokens !== void 0 && !isPositiveInteger(model.maxTokens)) throw new Error("llm-commandcode: invalid maxTokens for " + model.id);
		if (model.thinking !== void 0 && typeof model.thinking !== "boolean") throw new Error("llm-commandcode: invalid thinking for " + model.id);
		const normalizedEffort = model.thinking === false ? void 0 : model.defaultEffort;
		const effortModel = normalizedEffort === void 0 ? { id: model.id } : {
			id: model.id,
			defaultEffort: normalizedEffort
		};
		const efforts = effortsForCommandCodeModel({ id: model.id });
		const hasEfforts = efforts.length > 0;
		const effectiveThinking = model.thinking ?? (hasEfforts ? void 0 : void 0);
		if (normalizedEffort !== void 0 && !efforts.includes(normalizedEffort)) throw new Error("llm-commandcode: defaultEffort is not offered for " + model.id);
		const defaultEffort = model.thinking === false ? void 0 : defaultEffortForCommandCodeModel(effortModel);
		const input = model.inputModalities === void 0 ? inputModalitiesForCommandCodeModel(model.id) : model.inputModalities.length === 0 ? ["text"] : model.inputModalities;
		if (new Set(input).size !== input.length || input.some((item) => !MODEL_MODALITIES.includes(item))) throw new Error("llm-commandcode: invalid inputModalities for " + model.id);
		const persistedEffort = model.thinking === false ? void 0 : defaultEffort;
		return {
			id: model.id,
			...model.name === void 0 ? {} : { name: model.name },
			...model.description === void 0 ? {} : { description: model.description },
			...model.contextWindow === void 0 ? {} : { contextWindow: model.contextWindow },
			...model.contextWindowOverride === void 0 ? {} : { contextWindowOverride: model.contextWindowOverride },
			...model.maxTokens === void 0 ? {} : { maxTokens: model.maxTokens },
			...effectiveThinking === void 0 ? {} : { thinking: effectiveThinking },
			...persistedEffort === void 0 ? {} : { defaultEffort: persistedEffort },
			inputModalities: [...input]
		};
	});
}
function resolveAdapterOptions(config) {
	const defaultContextWindow = config.defaultContextWindow ?? 1e6;
	const defaultMaxTokens = config.defaultMaxTokens ?? 32768;
	const requestTimeoutMs = config.requestTimeoutMs ?? 6e4;
	const streamIdleTimeoutMs = config.streamIdleTimeoutMs ?? 3e5;
	if (!isPositiveInteger(defaultContextWindow)) throw new Error("llm-commandcode: defaultContextWindow must be positive");
	if (!isPositiveInteger(defaultMaxTokens)) throw new Error("llm-commandcode: defaultMaxTokens must be positive");
	if (!isPositiveInteger(requestTimeoutMs) || requestTimeoutMs > MAX_TIMER_DELAY_MS) throw new Error("llm-commandcode: requestTimeoutMs is invalid");
	if (!isPositiveInteger(streamIdleTimeoutMs) || streamIdleTimeoutMs > MAX_TIMER_DELAY_MS) throw new Error("llm-commandcode: streamIdleTimeoutMs is invalid");
	return {
		apiKeyEnv: credentialRef(config.apiKeyEnv ?? "COMMANDCODE_API_KEY"),
		providerBaseURL: PUBLIC_PROVIDER_BASE_URL,
		models: resolveModels(config.models),
		defaultContextWindow,
		defaultMaxTokens,
		requestTimeoutMs,
		streamIdleTimeoutMs,
		zeroDataRetention: config.zeroDataRetention ?? false,
		usageEnabled: config.usageEnabled ?? true,
		retryPolicy: resolveRetryPolicy(config.retryPolicy ?? DEFAULT_RETRY_POLICY, "llm-commandcode: retryPolicy")
	};
}
function failure(message) {
	return {
		ok: false,
		error: {
			code: "internal",
			message,
			details: {}
		}
	};
}
function apply(ctx, config) {
	let current = () => config;
	let lastRaw;
	let lastGood;
	const options = () => {
		const raw = current();
		if (raw === lastRaw && lastGood !== void 0) return lastGood;
		try {
			const next = resolveAdapterOptions(raw);
			lastRaw = raw;
			lastGood = next;
			return next;
		} catch (error) {
			if (lastGood === void 0) throw error;
			lastRaw = raw;
			ctx.logger.error("llm-commandcode: keeping the last good configuration");
			ctx.logger.error(error);
			return lastGood;
		}
	};
	options();
	const credentialValue = async (ref) => {
		const credentials = ctx.get("credentials");
		return credentials === void 0 ? void 0 : (await credentials.resolve(ref))?.value;
	};
	const storedApiKey = () => credentialValue(options().apiKeyEnv);
	const credentialStatus = async () => {
		const credentials = ctx.get("credentials");
		if (credentials === void 0) return {
			configured: false,
			writable: false
		};
		const info = await credentials.describe(options().apiKeyEnv);
		return {
			configured: info.configured,
			writable: info.writable
		};
	};
	const resolveApiKey = async (connection) => {
		const raw = await credentialValue(connection.apiKeyEnv);
		if (raw !== void 0 && raw.length > 0) return assertUsableApiKey(raw, name, connection.apiKeyEnv);
		throw new LlmError("llm-commandcode: no DSH credential is configured for provider route \"commandcode\"", "MISSING_CREDENTIAL");
	};
	const adapter = new CommandCodeAdapter({
		options,
		resolveApiKey,
		resolveAttachments: () => ctx.get("attachments")
	});
	ctx.llm.registerConfigurableProviders([{
		provider: COMMANDCODE_PROVIDER,
		displayName: "Command Code",
		settingsNs: NS,
		settingsPath: []
	}]);
	const registration = ctx.llm.registerAdapter([COMMANDCODE_PROVIDER], adapter);
	let registeredPolicy = options().retryPolicy;
	const ensureRegistration = () => {
		const policy = options().retryPolicy;
		if (deepEqualJson(policy, registeredPolicy)) return;
		registration.replace([COMMANDCODE_PROVIDER]);
		registeredPolicy = policy;
	};
	ctx.llm.registerModelDiscovery(NS, async (_request, signal) => {
		return (await discoverModels(signal === void 0 ? {} : { signal })).models;
	});
	ctx.effect(() => {
		return ctx.inject(["connection"], (connectionCtx) => {
			connectionCtx.effect(() => connectionCtx.connection.rpc.handle(COMMANDCODE_RPC_CHANNEL, async (endpoint, payload, signal) => {
				if (endpoint === "settings/read") {
					const descriptor = ctx.get("settings")?.describe().find((item) => item.ns === NS);
					const settings = decodeCommandCodeSettings(descriptor?.value);
					if (descriptor === void 0 || settings === void 0) return failure("Command Code settings are unavailable");
					return {
						ok: true,
						value: {
							settings,
							revision: descriptor.revision,
							credential: await credentialStatus()
						}
					};
				}
				if (endpoint === "credentials/status") return {
					ok: true,
					value: await credentialStatus()
				};
				if (endpoint === "credentials/set") {
					const request = decodeCommandCodeCredentialSetRequest(payload);
					if (request === void 0) return failure("invalid Command Code credential request");
					const credentials = ctx.get("credentials");
					if (credentials === void 0) return failure("Command Code credentials are unavailable");
					try {
						await credentials.set(options().apiKeyEnv, request.apiKey);
					} catch (error) {
						return failure("Command Code credential write failed");
					}
					return {
						ok: true,
						value: await credentialStatus()
					};
				}
				if (endpoint === "models/discover") {
					if (decodeCommandCodeDiscoveryRequest(payload) === void 0) return failure("invalid Command Code discovery request");
					try {
						return {
							ok: true,
							value: await discoverModels({ signal })
						};
					} catch (error) {
						return failure(error instanceof Error ? error.message : "Command Code model discovery failed");
					}
				}
				if (endpoint === "usage/read") {
					if (decodeCommandCodeUsageRequest(payload) === void 0) return failure("invalid Command Code usage request");
					if (!options().usageEnabled) return {
						ok: true,
						value: { status: "unsupported" }
					};
					try {
						return {
							ok: true,
							value: await readCommandCodeUsage({ signal }, storedApiKey)
						};
					} catch (error) {
						return failure(error instanceof Error ? error.message : "Command Code usage read failed");
					}
				}
				if (endpoint === "settings/save") {
					const request = decodeCommandCodeSaveRequest(payload);
					if (request === void 0) return failure("invalid Command Code settings request");
					const settings = ctx.get("settings");
					if (settings === void 0) return failure("Command Code settings are unavailable");
					try {
						const before = settings.describe().find((descriptor) => descriptor.ns === NS);
						if (before === void 0) return failure("Command Code settings are unavailable");
						const currentSettings = decodeCommandCodeSettings(before.value);
						if (currentSettings === void 0) return failure("Command Code settings are invalid");
						const next = {
							...currentSettings,
							...request.settings,
							apiKeyEnv: currentSettings.apiKeyEnv
						};
						const ops = [];
						for (const field of [
							"models",
							"defaultContextWindow",
							"defaultMaxTokens",
							"requestTimeoutMs",
							"streamIdleTimeoutMs",
							"zeroDataRetention",
							"usageEnabled"
						]) if (!deepEqualJson(currentSettings[field], next[field])) ops.push({
							op: "set",
							path: [field],
							value: next[field]
						});
						if (ops.length > 0) await settings.mutate(NS, ops, request.expectedRevision);
						const accepted = settings.describe().find((descriptor) => descriptor.ns === NS);
						const acceptedSettings = decodeCommandCodeSettings(accepted?.value);
						if (accepted === void 0 || acceptedSettings === void 0) return failure("Command Code settings could not be reloaded");
						return {
							ok: true,
							value: {
								settings: acceptedSettings,
								revision: accepted.revision
							}
						};
					} catch (error) {
						return failure(error instanceof Error ? error.message : "Command Code settings save failed");
					}
				}
				return failure("unknown Command Code endpoint: " + endpoint);
			}), "llm-commandcode: authenticated Connection RPC");
		}).dispose;
	}, "llm-commandcode: Connection injection");
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.installSection(ctx, NS, Config, config, {
			setSource: (source) => {
				current = source;
			},
			onChange: ensureRegistration,
			validate: (value) => {
				resolveAdapterOptions(value);
			}
		});
	});
}
//#endregion
export { COMMANDCODE_CREDENTIAL_SET_ENDPOINT, COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT, COMMANDCODE_PROVIDER, COMMANDCODE_RPC_CHANNEL, COMMANDCODE_SETTINGS_NAMESPACE, COMMANDCODE_SETTINGS_READ_ENDPOINT, CommandCodeAdapter, Config, DEFAULT_API_KEY_ENV, DEFAULT_CONTEXT_WINDOW, DEFAULT_MAX_TOKENS, DEFAULT_MODELS, DEFAULT_REQUEST_TIMEOUT_MS, DEFAULT_STREAM_IDLE_TIMEOUT_MS, PUBLIC_PROVIDER_BASE_URL, apply, decodeCommandCodeCredentialSetRequest, decodeCommandCodeDiscoveryRequest, decodeCommandCodeDiscoveryResult, decodeCommandCodeModel, decodeCommandCodeSaveRequest, decodeCommandCodeSaveResult, decodeCommandCodeSettings, decodeCommandCodeSettingsReadResult, decodeCommandCodeUsageReply, decodeCommandCodeUsageRequest, decodeCommandCodeUsageView, discoverModels, inject, name, parseCommandCodeModels, parseCommandCodeUsageBodies, protocolForModel, resolveAdapterOptions };
