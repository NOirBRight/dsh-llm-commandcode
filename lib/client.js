window.__ModuleLoader__.load({
	id: "dsh-llm-commandcode",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_dom = require("react-dom");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/numbers.ts
		/** Browser-safe numeric domain predicates shared by config and wire decoders. */
		function isPositiveInteger(value) {
			return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
		}
		//#endregion
		//#region src/reasoning-catalog.ts
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
			"deepseek/deepseek-v4.1-flash": LOW_HIGH_MAX,
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
		const CANON_EFFORTS = new Set(EFFORT_RANK);
		/** Map a models.dev / wire effort token onto the plugin's level ids. */
		function canonCommandCodeEffort(value) {
			const key = value.toLowerCase();
			return CANON_EFFORTS.has(key) ? key : void 0;
		}
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
			return OFFICIAL_EFFORTS[model.id.toLowerCase()] ?? model.thinkingEfforts ?? [];
		}
		//#endregion
		//#region src/client-contract.ts
		const COMMANDCODE_SETTINGS_NAMESPACE = "llm-commandcode";
		const PUBLIC_PROVIDER_BASE_URL = "https://api.commandcode.ai/provider/v1";
		const COMMANDCODE_RPC_CHANNEL = "/commandcode";
		const COMMANDCODE_SETTINGS_READ_ENDPOINT = "settings/read";
		const COMMANDCODE_DISCOVER_ENDPOINT = "models/discover";
		const COMMANDCODE_SAVE_ENDPOINT = "settings/save";
		const COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT = "credentials/status";
		const COMMANDCODE_CREDENTIAL_SET_ENDPOINT = "credentials/set";
		const COMMANDCODE_USAGE_ENDPOINT = "usage/read";
		function record(value) {
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
			if (!record(value) || hasTokenFields(value) || typeof value.id !== "string" || value.id.length === 0) return void 0;
			if (value.name !== void 0 && typeof value.name !== "string") return void 0;
			if (value.description !== void 0 && typeof value.description !== "string") return void 0;
			if (!optionalPositiveInteger(value.contextWindow)) return void 0;
			if (!optionalPositiveInteger(value.contextWindowOverride)) return void 0;
			if (!optionalPositiveInteger(value.maxTokens)) return void 0;
			if (value.reasoningEfforts !== void 0) return void 0;
			if (value.thinking !== void 0 && typeof value.thinking !== "boolean") return void 0;
			let thinkingEfforts;
			if (value.thinkingEfforts !== void 0) {
				if (!Array.isArray(value.thinkingEfforts)) return void 0;
				thinkingEfforts = [];
				for (const item of value.thinkingEfforts) {
					if (typeof item !== "string") return void 0;
					const effort = canonCommandCodeEffort(item);
					if (effort === void 0 || thinkingEfforts.includes(effort)) return void 0;
					thinkingEfforts.push(effort);
				}
				if (thinkingEfforts.length === 0) thinkingEfforts = void 0;
			}
			const thinking = value.thinking;
			const rawEffort = thinking === false ? void 0 : value.defaultEffort;
			const effortModel = thinkingEfforts === void 0 ? { id: value.id } : {
				id: value.id,
				thinkingEfforts
			};
			if (rawEffort !== void 0) {
				if (typeof rawEffort !== "string" || rawEffort.length === 0) return void 0;
				if (!effortsForCommandCodeModel(effortModel).includes(rawEffort)) return void 0;
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
				...thinkingEfforts === void 0 ? {} : { thinkingEfforts },
				...modalities === void 0 ? {} : { inputModalities: modalities }
			};
		}
		function decodeCommandCodeSettings(value) {
			if (!record(value) || hasTokenFields(value)) return void 0;
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
		function decodeCommandCodeDiscoveryResult(value) {
			if (!record(value) || hasTokenFields(value) || !Array.isArray(value.models) || !Array.isArray(value.warnings)) return void 0;
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
		function decodeCommandCodeSaveResult(value) {
			if (!record(value) || hasTokenFields(value)) return void 0;
			const revision = value.revision;
			if (!Number.isSafeInteger(revision) || revision < 0) return void 0;
			const settings = decodeCommandCodeSettings(value.settings);
			return settings === void 0 ? void 0 : {
				settings,
				revision
			};
		}
		function decodeUsageWindow(value) {
			if (!record(value) || !positiveOrZero(value.used) || !positiveOrZero(value.cap)) return void 0;
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
			if (!record(value) || hasTokenFields(value) || !record(value.credential)) return void 0;
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
		function decodeCommandCodeUsageView(value) {
			if (!record(value) || hasTokenFields(value) || typeof value.fetchedAt !== "string" || !Array.isArray(value.failures)) return void 0;
			if (value.failures.some((item) => typeof item !== "string")) return void 0;
			const usage = {
				fetchedAt: value.fetchedAt,
				failures: [...value.failures]
			};
			if (value.account !== void 0) {
				if (!record(value.account)) return void 0;
				if (value.account.name !== void 0 && typeof value.account.name !== "string") return void 0;
				if (value.account.userName !== void 0 && typeof value.account.userName !== "string") return void 0;
				usage.account = {
					...value.account.name === void 0 ? {} : { name: value.account.name },
					...value.account.userName === void 0 ? {} : { userName: value.account.userName }
				};
			}
			if (value.credits !== void 0) {
				if (!record(value.credits)) return void 0;
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
				if (!record(value.plan)) return void 0;
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
				if (!record(value.summary)) return void 0;
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
			if (!record(value) || value.status !== "ok" && value.status !== "unsupported") return void 0;
			if (value.status === "unsupported") return { status: "unsupported" };
			const usage = decodeCommandCodeUsageView(value.usage);
			return usage === void 0 ? void 0 : {
				status: "ok",
				usage
			};
		}
		//#endregion
		//#region src/catalog-groups.ts
		const PREMIUM_EXACT = /* @__PURE__ */ new Set([
			"gpt-5.6-terra",
			"gpt-5.5",
			"gpt-5.4",
			"gpt-5.3-codex",
			"gpt-5.4-mini",
			"google/gemini-3.5-flash",
			"google/gemini-3.1-flash-lite",
			"sakana/fugu-ultra",
			"meta/muse-spark-1.1"
		]);
		const PROVIDER_EXACT = /* @__PURE__ */ new Set([
			"claude-fable-5",
			"claude-opus-5",
			"claude-opus-4-8",
			"claude-opus-4-7",
			"claude-opus-4-6",
			"claude-opus-4-5-20251101"
		]);
		const OPEN_EXACT = /* @__PURE__ */ new Set([
			"gpt-5.6-sol",
			"gpt-5.6-luna",
			"google/gemini-3.7-flash",
			"meta/muse-spark-1.2",
			"meta/muse-spark-1.2-contributor",
			"xai/grok-4.5",
			"xai/grok-4.6",
			"tencent/hy3-paid",
			"tencent/hy3",
			"minimax/minimax-m3-free",
			"minimax/minimax-m2.7-free"
		]);
		function normalized(id) {
			return id.toLowerCase();
		}
		/** Return the lowest official CLI plan group known for this model id. */
		function planGroupForModel(id) {
			const key = normalized(id);
			if (PROVIDER_EXACT.has(key)) return "provider";
			if (key.startsWith("claude-")) return "pro";
			if (PREMIUM_EXACT.has(key)) return "pro";
			if (OPEN_EXACT.has(key)) return "go";
			if (key.startsWith("deepseek/") || key.startsWith("moonshotai/") || key.startsWith("zai-org/") || key.startsWith("qwen/") || key.startsWith("stepfun/") || key.startsWith("xiaomi/") || key.startsWith("minimax/") || key.startsWith("minimaxai/") || key.startsWith("thinkingmachines/") || key.startsWith("nvidia/")) return "go";
			return "other";
		}
		const GROUP_LABELS = {
			go: "Go · open models",
			pro: "Pro · premium models",
			provider: "Provider+ · frontier models",
			other: "Other · verify access"
		};
		const GROUP_ORDER = [
			"go",
			"pro",
			"provider",
			"other"
		];
		/** Group provider candidates without changing their order within a group. */
		function groupCommandCodeModels(models) {
			const groups = /* @__PURE__ */ new Map();
			for (const model of models) {
				const group = planGroupForModel(model.id);
				const items = groups.get(group) ?? [];
				items.push(model);
				groups.set(group, items);
			}
			return GROUP_ORDER.flatMap((id) => {
				const items = groups.get(id);
				return items === void 0 ? [] : [{
					id,
					label: GROUP_LABELS[id],
					models: items
				}];
			});
		}
		//#endregion
		//#region src/client/CommandCodeModelPicker.tsx
		/** Frame-level model selection overlay opened by the CommandCode settings card. */
		/** Shared observable joining the settings card to its frame-level overlay. */
		var CommandCodeModelPickerController = class {
			snapshot = {
				open: false,
				loading: false,
				candidates: [],
				picked: /* @__PURE__ */ new Set()
			};
			listeners = /* @__PURE__ */ new Set();
			onAdopt;
			/** Read the stable snapshot identity until picker state changes. */
			getSnapshot = () => this.snapshot;
			/** Subscribe one renderer listener. */
			subscribe = (listener) => {
				this.listeners.add(listener);
				return () => {
					this.listeners.delete(listener);
				};
			};
			/** Open immediately while discovery loads with the current selection captured. */
			begin(onAdopt, initiallyPicked = /* @__PURE__ */ new Set()) {
				this.onAdopt = onAdopt;
				this.publish({
					open: true,
					loading: true,
					candidates: [],
					picked: new Set(initiallyPicked)
				});
			}
			/** Populate an open loading picker, retaining only current ids present in the result. */
			complete(candidates) {
				if (!this.snapshot.open || !this.snapshot.loading) return;
				const candidateIds = new Set(candidates.map((model) => model.id));
				this.publish({
					open: true,
					loading: false,
					candidates: [...candidates],
					picked: new Set([...this.snapshot.picked].filter((id) => candidateIds.has(id)))
				});
			}
			/** Keep the open picker visible with a discovery failure. */
			fail(message) {
				if (!this.snapshot.open || !this.snapshot.loading) return;
				this.publish({
					open: true,
					loading: false,
					candidates: [],
					picked: /* @__PURE__ */ new Set(),
					error: message
				});
			}
			/** Close without adopting any candidate. */
			close = () => {
				this.onAdopt = void 0;
				this.publish({
					open: false,
					loading: false,
					candidates: [],
					picked: /* @__PURE__ */ new Set()
				});
			};
			/** Toggle one candidate by id. */
			toggle = (id) => {
				const picked = new Set(this.snapshot.picked);
				if (picked.has(id)) picked.delete(id);
				else picked.add(id);
				this.publish({
					...this.snapshot,
					picked
				});
			};
			/** Close and deliver the selected candidates to the card. */
			adopt = () => {
				if (this.snapshot.loading || this.snapshot.error !== void 0) return;
				const callback = this.onAdopt;
				const selected = this.snapshot.candidates.filter((model) => this.snapshot.picked.has(model.id));
				this.close();
				callback?.(selected);
			};
			publish(snapshot) {
				this.snapshot = snapshot;
				for (const listener of this.listeners) listener();
			}
		};
		const rootStyle = {
			position: "fixed",
			inset: 0,
			zIndex: 1e3,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			boxSizing: "border-box",
			padding: 24
		};
		const maskStyle = {
			position: "absolute",
			inset: 0,
			background: "var(--dsw-alias-bg-mask-1)",
			backdropFilter: "var(--dsw-mask-blur)"
		};
		const dialogStyle = {
			position: "relative",
			zIndex: 1,
			display: "flex",
			flexDirection: "column",
			width: "min(520px, 100%)",
			maxHeight: "min(680px, calc(100vh - 48px))",
			overflow: "hidden",
			border: "1px solid var(--dsw-alias-border-inverted)",
			borderRadius: 24,
			background: "var(--dsw-alias-bg-layer-2)",
			boxShadow: "var(--dsw-shadow-lv3)",
			color: "var(--dsw-alias-label-primary)"
		};
		const headerStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			gap: 8,
			padding: "22px 14px 12px 24px"
		};
		const titleStyle = {
			margin: 0,
			fontSize: 16,
			lineHeight: "24px",
			fontWeight: 500
		};
		const closeStyle = {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: 28,
			height: 28,
			border: 0,
			borderRadius: 8,
			background: "transparent",
			color: "var(--dsw-alias-label-secondary)",
			cursor: "pointer",
			fontSize: 22
		};
		const descriptionStyle = {
			margin: 0,
			padding: "0 24px",
			fontSize: 14,
			lineHeight: "22px",
			color: "var(--dsw-alias-label-primary)"
		};
		const listStyle$1 = {
			display: "flex",
			flexDirection: "column",
			gap: 14,
			minHeight: 0,
			margin: "20px 24px",
			padding: 0,
			overflowY: "auto",
			listStyle: "none"
		};
		const candidateStyle = {
			display: "flex",
			alignItems: "flex-start",
			gap: 10,
			fontSize: 14,
			lineHeight: "22px",
			cursor: "pointer"
		};
		const groupStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 8
		};
		const groupTitleStyle = {
			margin: 0,
			fontSize: 13,
			lineHeight: "18px",
			fontWeight: 600,
			color: "var(--dsw-alias-label-secondary)"
		};
		const candidateInfoStyle = {
			display: "flex",
			flexDirection: "column",
			minWidth: 0,
			gap: 1
		};
		const candidateIdStyle = {
			fontSize: 12,
			lineHeight: "17px",
			color: "var(--dsw-alias-label-tertiary)",
			overflowWrap: "anywhere"
		};
		const statusStyle$1 = {
			display: "flex",
			alignItems: "center",
			minHeight: 96,
			margin: "20px 24px",
			fontSize: 14,
			lineHeight: "22px",
			color: "var(--dsw-alias-label-secondary)"
		};
		const errorStyle$1 = {
			...statusStyle$1,
			color: "var(--dsw-alias-state-error-primary)"
		};
		const footerStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "flex-end",
			gap: 8,
			padding: "0 24px 24px"
		};
		const outlineButtonStyle = {
			height: 36,
			padding: "0 14px",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 18,
			background: "transparent",
			color: "var(--dsw-alias-label-primary)",
			cursor: "pointer",
			fontSize: 14
		};
		/** Render the CommandCode model candidate picker in the frame overlay layer. */
		function CommandCodeModelPicker(props) {
			const { t } = props;
			const snapshot = props.useCommandCodeModelPicker((value) => value);
			(0, react.useEffect)(() => {
				if (!snapshot.open) return;
				const onKeyDown = (event) => {
					if (event.key === "Escape") props.closePicker();
				};
				document.addEventListener("keydown", onKeyDown);
				return () => {
					document.removeEventListener("keydown", onKeyDown);
				};
			}, [snapshot.open, props.closePicker]);
			if (!snapshot.open) return null;
			return (0, react_dom.createPortal)(/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: rootStyle,
				role: "presentation",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
					style: maskStyle,
					"aria-hidden": "true",
					onClick: props.closePicker
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
					style: dialogStyle,
					role: "dialog",
					"aria-modal": "true",
					"aria-label": t("pickerTitle"),
					"aria-busy": snapshot.loading,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: headerStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", {
								style: titleStyle,
								children: t("pickerTitle")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: closeStyle,
								"aria-label": t("close"),
								onClick: props.closePicker,
								children: "×"
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: descriptionStyle,
							children: t("pickerDescription")
						}),
						snapshot.loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: statusStyle$1,
							role: "status",
							children: t("pickerLoading")
						}) : snapshot.error !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							style: errorStyle$1,
							role: "alert",
							children: snapshot.error
						}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							style: listStyle$1,
							children: groupCommandCodeModels(snapshot.candidates).map((group) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
								style: groupStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
									style: groupTitleStyle,
									children: group.id === "go" ? t("groupGo") : group.id === "pro" ? t("groupPro") : group.id === "provider" ? t("groupProvider") : t("groupOther")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									style: {
										...listStyle$1,
										margin: 0,
										gap: 8
									},
									children: group.models.map((model) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: candidateStyle,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: snapshot.picked.has(model.id),
											onChange: () => {
												props.togglePickerModel(model.id);
											}
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: candidateInfoStyle,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: model.name ?? model.id }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
												style: candidateIdStyle,
												children: [
													model.id,
													" · ",
													model.contextWindow?.toLocaleString() ?? t("contextUnknown")
												]
											})]
										})]
									}) }, model.id))
								})]
							}, group.id))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							style: footerStyle,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: outlineButtonStyle,
								onClick: props.closePicker,
								children: t("cancel")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								style: {
									...outlineButtonStyle,
									...snapshot.loading || snapshot.error !== void 0 ? {
										cursor: "not-allowed",
										opacity: .4
									} : {}
								},
								disabled: snapshot.loading || snapshot.error !== void 0,
								onClick: props.adoptPickerModels,
								children: t("applySelected")
							})]
						})
					]
				})]
			}), document.body);
		}
		//#endregion
		//#region node_modules/.pnpm/dsh-llm-providers-ui@https+++github.com+NOirBRight+dsh-llm-providers-ui+releases+downlo_9fe3bd448b199fdcbe5d71b8de10bff6/node_modules/dsh-llm-providers-ui/lib/usage-readers.js
		/** Bundle-safe quota decoders, RPC readers, and browser cache helpers; no ModuleLoader wrapper or reactive store. */
		/**
		* Wire error code the Host answers when the provider credential is missing or
		* unusable (mirrors `INVALID_CREDENTIAL_CODE` in `@deepseek-ai/dsh-llm`, which a
		* browser bundle cannot import). Mapped to `logged-out` so a provider without a
		* usable credential never keeps serving the previous account's quota.
		*/
		const INVALID_CREDENTIAL_CODE = "INVALID_CREDENTIAL";
		/** Whether one RPC failure means "this provider has no usable credential". */
		function credentialFailure(error) {
			return error.code === INVALID_CREDENTIAL_CODE;
		}
		/** Plain-object guard shared by the reader factories and the sidebar cache validator. */
		function recordUsageValue(value) {
			return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
		}
		const SECRET_KEY = /^(?:accessToken|refreshToken|access_token|refresh_token|id_token|idToken|token|apiKey|api_key)$/iu;
		/** Reject any secret-shaped field before a provider response enters UI state. */
		function secretFree(value) {
			if (Array.isArray(value)) return value.every(secretFree);
			const item = recordUsageValue(value);
			if (item === void 0) return true;
			return Object.entries(item).every(([key, child]) => !SECRET_KEY.test(key) && secretFree(child));
		}
		/** Non-empty string guard shared by the reader factories and the sidebar cache validator. */
		function nonEmptyString(value) {
			return typeof value === "string" && value.length > 0;
		}
		function finiteNumber(value) {
			return typeof value === "number" && Number.isFinite(value);
		}
		/** Non-negative finite number guard shared by the reader factories and the sidebar cache validator. */
		function nonNegativeNumber(value) {
			return finiteNumber(value) && value >= 0;
		}
		function displayNumber(value) {
			return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
		}
		function percentage(value) {
			return Math.round(Math.max(0, Math.min(100, value)));
		}
		function percentageText(value) {
			return displayNumber(percentage(value)) + "%";
		}
		const SHORT_LABELS = [
			[/five|5h|5-hour/u, "5h"],
			[/two-hour|2-hour|2h/u, "2h"],
			[/session/u, "S"],
			[/week/u, "W"],
			[/month/u, "M"],
			[/credit/u, "Cr"],
			[/agent/u, "A"],
			[/daily|day/u, "D"],
			[/local/u, "L"],
			[/other/u, "Oth"]
		];
		function shortLabel(value) {
			const normalized = value.toLowerCase();
			if (/^\d+h$/u.test(normalized)) return normalized;
			return SHORT_LABELS.find(([pattern]) => pattern.test(normalized))?.[1] ?? value.slice(0, 4);
		}
		const PERIOD_RANK = {
			M: 6,
			W: 5,
			D: 4,
			CURS: 3,
			S: 1,
			A: 0,
			L: 0,
			CR: -1
		};
		function periodRank(shortLabelValue) {
			const normalized = shortLabelValue.toUpperCase();
			return PERIOD_RANK[normalized] ?? (/^\d+H$/.test(normalized) ? 2 : 0);
		}
		/** Headline window: longest percentage period, else the first text-only window. */
		function pickPrimaryWindow(windows) {
			let best;
			for (const quotaWindow of windows) {
				if (quotaWindow.remainingPercent === void 0) continue;
				if (best === void 0 || periodRank(quotaWindow.shortLabel) > periodRank(best.shortLabel)) best = quotaWindow;
			}
			return best ?? windows[0];
		}
		function remainingWindow(input) {
			const remaining = input.limit === 0 ? void 0 : percentage(100 * (1 - input.used / input.limit));
			return {
				id: input.id,
				label: input.label,
				shortLabel: shortLabel(input.label),
				...remaining === void 0 ? { valueText: displayNumber(Math.max(0, input.limit - input.used)) + " / " + displayNumber(input.limit) } : {
					remainingPercent: remaining,
					valueText: percentageText(remaining)
				},
				...input.resetsAt === void 0 ? {} : { resetsAt: input.resetsAt }
			};
		}
		function usageResult(value, decode) {
			const response = recordUsageValue(value);
			if (response === void 0 || !secretFree(response)) return {
				status: "error",
				message: "malformed usage response"
			};
			if (response.status === "unsupported") return { status: "unsupported" };
			if (response.status === "logged-out") return { status: "logged-out" };
			if (response.status !== "ok") return {
				status: "error",
				message: "unknown usage status"
			};
			const usage = recordUsageValue(response.usage);
			const decoded = usage === void 0 ? void 0 : decode(usage);
			return decoded === void 0 ? {
				status: "error",
				message: "malformed usage response"
			} : {
				status: "ready",
				...decoded
			};
		}
		function decodeCommandCodeUsage(usage) {
			if (!nonEmptyString(usage.fetchedAt)) return void 0;
			if (usage.failures !== void 0 && (!Array.isArray(usage.failures) || usage.failures.some((item) => typeof item !== "string"))) return void 0;
			const credits = usage.credits;
			if (credits === void 0) return {
				fetchedAt: usage.fetchedAt,
				windows: []
			};
			const value = recordUsageValue(credits);
			if (value === void 0) return void 0;
			const windows = [];
			const monthly = value.monthlyCredits;
			if (monthly !== void 0) {
				if (!nonNegativeNumber(monthly)) return void 0;
				windows.push({
					id: "monthly-credits",
					label: "Credits",
					shortLabel: "Cr",
					valueText: displayNumber(monthly)
				});
			}
			for (const [key, label] of [["fiveHour", "5-hour"], ["weekly", "Week"]]) {
				const raw = value[key];
				if (raw === void 0) continue;
				const item = recordUsageValue(raw);
				if (item === void 0 || !nonNegativeNumber(item.used) || !nonNegativeNumber(item.cap)) return void 0;
				if (item.resetAt !== void 0 && !nonEmptyString(item.resetAt)) return void 0;
				windows.push(remainingWindow({
					id: key,
					label,
					used: item.used,
					limit: item.cap,
					...item.resetAt === void 0 ? {} : { resetsAt: item.resetAt }
				}));
			}
			return {
				fetchedAt: usage.fetchedAt,
				windows
			};
		}
		async function readUsage(rpc, channel, payload, signal, decode) {
			const result = await rpc.call(channel, "usage/read", payload, signal);
			if (result.ok) return usageResult(result.value, decode);
			if (credentialFailure(result.error)) return { status: "logged-out" };
			return {
				status: "error",
				message: result.error.message
			};
		}
		/** Create the CommandCode quota reader declared by the CommandCode client plugin. */
		function createCommandCodeUsageReader() {
			return {
				providerKey: "llm-commandcode",
				name: "CommandCode",
				read: (rpc, _refresh, signal) => readUsage(rpc, "/commandcode", {}, signal, decodeCommandCodeUsage)
			};
		}
		const USAGE_CACHE_KEY = "dsh-llm-providers-ui:usage-cache";
		/**
		* Browser last-good usage cache shared across bundles: the sidebar store and
		* each provider Settings card bundle their own copy of this module, so the
		* module-level memory map below is per-bundle while storage is shared.
		* Readable storage is authoritative, including empty after invalidation; memory
		* is only a fallback while storage is unavailable. Stale status persists
		* honestly, and collapsed-header headlines never replace a full multi-window
		* summary (a later full read upgrades a headline).
		*/
		let memoryUsageCache = /* @__PURE__ */ new Map();
		/** Whether a ready or stale summary retains displayable usage windows.
		* @param summary - Current or retained provider usage.
		* @returns Whether its windows can be displayed and persisted.
		*/
		function hasUsageData(summary) {
			return summary !== void 0 && summary.windows.length > 0 && (summary.status === "ready" || summary.status === "stale");
		}
		function cachedSummary(value) {
			const item = recordUsageValue(value);
			if (item === void 0 || !nonEmptyString(item.providerKey) || !nonEmptyString(item.name)) return void 0;
			const status = item.status;
			if (status !== "ready" && status !== "stale") return void 0;
			if (!Array.isArray(item.windows) || item.windows.length === 0) return void 0;
			const windows = [];
			for (const windowValue of item.windows) {
				const quotaWindow = recordUsageValue(windowValue);
				if (quotaWindow === void 0 || !nonEmptyString(quotaWindow.id) || !nonEmptyString(quotaWindow.label) || !nonEmptyString(quotaWindow.shortLabel) || !nonEmptyString(quotaWindow.valueText)) return void 0;
				if (quotaWindow.remainingPercent !== void 0 && (!nonNegativeNumber(quotaWindow.remainingPercent) || quotaWindow.remainingPercent > 100)) return void 0;
				if (quotaWindow.resetsAt !== void 0 && !nonEmptyString(quotaWindow.resetsAt)) return void 0;
				windows.push({
					id: quotaWindow.id,
					label: quotaWindow.label,
					shortLabel: quotaWindow.shortLabel,
					valueText: quotaWindow.valueText,
					...quotaWindow.remainingPercent === void 0 ? {} : { remainingPercent: quotaWindow.remainingPercent },
					...quotaWindow.resetsAt === void 0 ? {} : { resetsAt: quotaWindow.resetsAt }
				});
			}
			return {
				providerKey: item.providerKey,
				name: item.name,
				status,
				windows,
				...nonEmptyString(item.fetchedAt) ? { fetchedAt: item.fetchedAt } : {}
			};
		}
		/** Readable storage backends. A backend that throws on read is unusable and skipped. */
		function usageStorageBackends() {
			const backends = [];
			for (const name of ["localStorage", "sessionStorage"]) try {
				const backend = globalThis[name];
				if (backend === void 0 || backend === null) continue;
				backend.getItem(USAGE_CACHE_KEY);
				backends.push(backend);
			} catch {}
			return backends;
		}
		function storageRead() {
			const backends = usageStorageBackends();
			if (backends.length === 0) return {
				available: false,
				raw: null
			};
			for (const backend of backends) try {
				const raw = backend.getItem(USAGE_CACHE_KEY);
				if (raw !== null) return {
					available: true,
					raw
				};
			} catch {}
			return {
				available: true,
				raw: null
			};
		}
		function storageWrite(value) {
			for (const backend of usageStorageBackends()) try {
				backend.setItem(USAGE_CACHE_KEY, value);
			} catch {}
		}
		function parseUsageCache(raw) {
			const cached = /* @__PURE__ */ new Map();
			if (raw === null) return cached;
			try {
				const parsed = JSON.parse(raw);
				if (!Array.isArray(parsed)) return cached;
				for (const value of parsed) {
					const item = cachedSummary(value);
					if (item !== void 0) cached.set(item.providerKey, item);
				}
			} catch {}
			return cached;
		}
		function readUsageCache() {
			const { available, raw } = storageRead();
			if (!available) return new Map(memoryUsageCache);
			const fromStorage = parseUsageCache(raw);
			memoryUsageCache = new Map(fromStorage);
			return fromStorage;
		}
		/** Persistable copy: status stays ready/stale as the caller holds it, never laundered to ready. */
		function persistableUsage(summary) {
			return {
				providerKey: summary.providerKey,
				name: summary.name,
				status: summary.status,
				windows: summary.windows,
				...summary.fetchedAt === void 0 ? {} : { fetchedAt: summary.fetchedAt }
			};
		}
		/** A collapsed-header single window, never a full multi-window summary. */
		function isHeadlineOnly(summary) {
			return summary.windows.length === 1 && summary.windows[0]?.id === "headline";
		}
		function writeUsageCache(current) {
			const entries = [...current.values()].filter(hasUsageData);
			const { available, raw } = storageRead();
			if (!available) {
				for (const item of entries) memoryUsageCache.set(item.providerKey, persistableUsage(item));
				return;
			}
			const merged = parseUsageCache(raw);
			for (const item of entries) {
				const previous = merged.get(item.providerKey);
				if (previous !== void 0 && !isHeadlineOnly(previous) && isHeadlineOnly(item)) continue;
				merged.set(item.providerKey, persistableUsage(item));
			}
			memoryUsageCache = new Map(merged);
			if (merged.size === 0) return;
			storageWrite(JSON.stringify([...merged.values()]));
		}
		function dropPersistedUsageKeys(keys) {
			const drop = new Set(keys);
			for (const key of drop) memoryUsageCache.delete(key);
			const { available, raw } = storageRead();
			if (!available || raw === null) return;
			let parsed;
			try {
				parsed = JSON.parse(raw);
			} catch {
				return;
			}
			if (!Array.isArray(parsed)) return;
			const kept = parsed.filter((value) => {
				const item = recordUsageValue(value);
				return item === void 0 || !nonEmptyString(item.providerKey) || !drop.has(item.providerKey);
			});
			if (kept.length === parsed.length) return;
			storageWrite(JSON.stringify(kept));
		}
		/** Last-good quota for a Provider card header, available on first paint. */
		function peekCachedUsage(providerKey) {
			return readUsageCache().get(providerKey);
		}
		function rememberCachedUsage(summary) {
			if (!hasUsageData(summary)) return;
			writeUsageCache(/* @__PURE__ */ new Map([[summary.providerKey, summary]]));
		}
		/**
		* Collapsed-header last-good quota for first paint. Ignores headlines without
		* a finite in-range remaining percent so missing quota renders no meter, never
		* a zero bar. Never replaces a cached full multi-window summary, and records
		* no fetchedAt: a headline is display data, not a fetch, so freshness checks
		* treat it as expired and refetch.
		*/
		function rememberHeadlineQuota(providerKey, name, quota) {
			if (quota?.remainingPercent === void 0 || !Number.isFinite(quota.remainingPercent)) return;
			const remainingPercent = Math.round(quota.remainingPercent * 10) / 10;
			if (remainingPercent < 0 || remainingPercent > 100) return;
			const label = quota.label ?? "Quota";
			rememberCachedUsage({
				providerKey,
				name,
				status: "ready",
				windows: [{
					id: "headline",
					label,
					shortLabel: label,
					valueText: String(remainingPercent) + "%",
					remainingPercent
				}]
			});
		}
		function headerQuotaFromCache(summary) {
			if (summary === void 0) return void 0;
			const quotaWindow = pickPrimaryWindow(summary.windows);
			if (quotaWindow === void 0) return void 0;
			return {
				label: quotaWindow.shortLabel || quotaWindow.label,
				...quotaWindow.remainingPercent === void 0 ? {} : { remainingPercent: quotaWindow.remainingPercent },
				...quotaWindow.resetsAt === void 0 ? {} : { detail: quotaWindow.resetsAt }
			};
		}
		//#endregion
		//#region src/client/BrandMark.tsx
		function BrandMark() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
				width: 18,
				height: 18,
				viewBox: "0 0 137 137",
				fill: "none",
				"aria-hidden": "true",
				style: { flex: "none" },
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "m0 66.7959c0-31.4879 0-47.2318 9.78204-57.01386 9.78206-9.78204 25.52596-9.78204 57.01396-9.78204h2.5357c31.4883 0 47.2323 0 57.0143 9.78204 9.782 9.78206 9.782 25.52596 9.782 57.01396v2.5357c0 31.4883 0 47.2323-9.782 57.0143s-25.526 9.782-57.0144 9.782h-2.5357c-31.4879 0-47.2318 0-57.01386-9.782-9.78204-9.782-9.78204-25.526-9.78204-57.0144z",
						fill: "currentColor"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						clipRule: "evenodd",
						d: "m69.3317 5.56633h-2.5357c-15.9014 0-27.2674.01182-35.905 1.17312-8.4775 1.13977-13.4886 3.29415-17.173 6.97855s-5.83878 8.6955-6.97855 17.173c-1.1613 8.6376-1.17312 20.0036-1.17312 35.9049v2.5357c0 15.9014.01182 27.2674 1.17312 35.9054 1.13977 8.477 3.29415 13.488 6.97855 17.173 3.6844 3.684 8.6955 5.838 17.173 6.978 8.6376 1.161 20.0036 1.173 35.9049 1.173h2.5357c15.9014 0 27.2674-.012 35.9054-1.173 8.477-1.14 13.488-3.294 17.173-6.978 3.684-3.685 5.838-8.696 6.978-17.173 1.161-8.638 1.173-20.004 1.173-35.9053v-2.5357c0-15.9014-.012-27.2674-1.173-35.905-1.14-8.4775-3.294-13.4886-6.978-17.173-3.685-3.6844-8.696-5.83878-17.173-6.97855-8.638-1.1613-20.004-1.17312-35.9053-1.17312zm-59.54966 4.21571c-9.78204 9.78206-9.78204 25.52596-9.78204 57.01386v2.5357c0 31.4884 0 47.2324 9.78204 57.0144 9.78206 9.782 25.52596 9.782 57.01386 9.782h2.5357c31.4884 0 47.2324 0 57.0144-9.782s9.782-25.526 9.782-57.0143v-2.5357c0-31.488 0-47.2319-9.782-57.01396-9.782-9.78204-25.526-9.78204-57.0143-9.78204h-2.5357c-31.488 0-47.2319 0-57.01396 9.78204z",
						fill: "currentColor",
						fillRule: "evenodd"
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
						d: "m93.6604 26.1784c-8.982 0-16.2887 7.3067-16.2887 16.2888v6.9809h-18.6158v-6.9809c0-8.9821-7.3067-16.2888-16.2887-16.2888-8.9821 0-16.2888 7.3067-16.2888 16.2888s7.3067 16.2887 16.2888 16.2887h6.9809v18.6158h-6.9809c-8.9821 0-16.2888 7.3067-16.2888 16.2888 0 8.9825 7.3067 16.2885 16.2888 16.2885 8.982 0 16.2887-7.306 16.2887-16.2885v-6.981h18.6158v6.981c0 8.9825 7.3067 16.2885 16.2887 16.2885 8.9826 0 16.2886-7.306 16.2886-16.2885 0-8.9821-7.306-16.2888-16.2886-16.2888h-6.9809v-18.6158h6.9809c8.9826 0 16.2886-7.3066 16.2886-16.2887s-7.306-16.2888-16.2886-16.2888zm-6.9809 23.2697v-6.9809c0-3.8628 3.1182-6.9809 6.9809-6.9809 3.8628 0 6.9806 3.1181 6.9806 6.9809 0 3.8627-3.1178 6.9809-6.9806 6.9809zm-44.2123 0c-3.8628 0-6.9809-3.1182-6.9809-6.9809 0-3.8628 3.1181-6.9809 6.9809-6.9809 3.8627 0 6.9809 3.1181 6.9809 6.9809v6.9809zm16.2887 27.9236v-18.6158h18.6158v18.6158zm34.9045 23.2693c-3.8627 0-6.9809-3.1178-6.9809-6.9805v-6.981h6.9809c3.8628 0 6.9806 3.1182 6.9806 6.981 0 3.8627-3.1178 6.9805-6.9806 6.9805zm-51.1932 0c-3.8628 0-6.9809-3.1178-6.9809-6.9805 0-3.8628 3.1181-6.981 6.9809-6.981h6.9809v6.981c0 3.8627-3.1182 6.9805-6.9809 6.9805z",
						fill: "var(--dsw-alias-bg-layer-1)"
					})
				]
			});
		}
		//#endregion
		//#region node_modules/.pnpm/dsh-llm-providers-ui@https+++github.com+NOirBRight+dsh-llm-providers-ui+releases+downlo_9fe3bd448b199fdcbe5d71b8de10bff6/node_modules/dsh-llm-providers-ui/lib/provider-ui.js
		/**
		* Normalize remaining quota to a 0-100 percent value.
		* Valid readings keep their precision (99.9 stays 99.9, never rounds to 100).
		* NaN, Infinity, and out-of-range readings are unavailable, not clamped:
		* clamping would fabricate a full or empty bar from bad data.
		* @param input - percent and/or fraction quota reading.
		* @returns the 0-100 remaining value, or undefined when unavailable.
		*/
		function normalizeQuotaRemaining(input) {
			const percent = input.remainingPercent;
			if (percent !== void 0) return Number.isFinite(percent) && percent >= 0 && percent <= 100 ? percent : void 0;
			const fraction = input.remainingFraction;
			if (fraction !== void 0) return Number.isFinite(fraction) && fraction >= 0 && fraction <= 1 ? fraction * 100 : void 0;
		}
		const meterWrapStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 5,
			minWidth: 0
		};
		const meterTopStyle = {
			display: "flex",
			alignItems: "baseline",
			justifyContent: "space-between",
			gap: 8
		};
		const meterLabelStyle = {
			minWidth: 0,
			overflow: "hidden",
			textOverflow: "ellipsis",
			whiteSpace: "nowrap",
			color: "var(--dsw-alias-label-secondary)",
			fontSize: 12,
			lineHeight: "18px"
		};
		const meterValueStyle = {
			flex: "none",
			fontVariantNumeric: "tabular-nums",
			fontWeight: 500,
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-primary)"
		};
		const meterTrackStyle = {
			display: "block",
			width: "100%",
			height: 6,
			overflow: "hidden",
			border: 0,
			borderRadius: 2,
			background: "color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent)",
			position: "relative"
		};
		const meterFillBase = {
			display: "block",
			height: "100%",
			borderRadius: 2,
			position: "relative",
			background: "color-mix(in srgb, var(--dsw-alias-label-primary) 55%, var(--dsw-alias-label-secondary))"
		};
		const meterKnobStyle = {
			position: "absolute",
			right: 0,
			top: 0,
			bottom: 0,
			width: 2,
			background: "var(--dsw-alias-label-primary)"
		};
		const meterSegmentsStyle = {
			position: "absolute",
			inset: 0,
			pointerEvents: "none",
			background: "repeating-linear-gradient(to right, transparent 0, transparent calc(10% - 1px), var(--dsw-alias-bg-layer-1) calc(10% - 1px), var(--dsw-alias-bg-layer-1) 10%)"
		};
		/** Approved A low-quota fill: amber only, no red tier, no hardcoded hue. */
		const meterWarnFill = { background: "var(--dsw-alias-state-warn-primary)" };
		const meterDetailStyle = {
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: 11,
			lineHeight: "16px"
		};
		const meterMissingStyle = {
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: 12,
			lineHeight: "18px"
		};
		/** Segmented remaining-quota meter. Unavailable quota renders a placeholder, never a zero bar. */
		function ProviderQuotaMeter(props) {
			const remaining = normalizeQuotaRemaining(props);
			const label = props.label ?? "Quota";
			if (remaining === void 0) return (0, react_jsx_runtime.jsx)("span", {
				"data-provider-quota-missing": "",
				style: meterMissingStyle,
				children: props.emptyLabel ?? "—"
			});
			const warn = remaining < 20;
			const text = String(remaining);
			return (0, react_jsx_runtime.jsxs)("span", {
				"data-provider-quota": "",
				style: meterWrapStyle,
				...props.id === void 0 ? {} : { id: props.id },
				children: [
					(0, react_jsx_runtime.jsxs)("span", {
						style: meterTopStyle,
						children: [(0, react_jsx_runtime.jsx)("span", {
							style: meterLabelStyle,
							children: label
						}), (0, react_jsx_runtime.jsx)("span", {
							style: meterValueStyle,
							children: text + "%"
						})]
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						"data-provider-quota-meter": "",
						role: "meter",
						"aria-label": label,
						"aria-valuemin": 0,
						"aria-valuemax": 100,
						"aria-valuenow": remaining,
						style: meterTrackStyle,
						children: [(0, react_jsx_runtime.jsx)("span", {
							style: {
								...meterFillBase,
								...warn ? meterWarnFill : {},
								width: text + "%"
							},
							children: (0, react_jsx_runtime.jsx)("span", { style: meterKnobStyle })
						}), (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							style: meterSegmentsStyle
						})]
					}),
					props.detail === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
						style: meterDetailStyle,
						children: props.detail
					})
				]
			});
		}
		const headerMainStyle = {
			display: "flex",
			alignItems: "center",
			gap: 14,
			minWidth: 0,
			flex: 1
		};
		const headerIdentityStyle = {
			display: "flex",
			alignItems: "center",
			gap: 12,
			minWidth: 0,
			flex: 1
		};
		const headerMarkStyle = {
			width: 28,
			height: 28,
			flex: "none",
			display: "grid",
			placeItems: "center",
			overflow: "visible"
		};
		const headerTitleColStyle = {
			display: "flex",
			flexDirection: "column",
			minWidth: 0,
			flex: 1
		};
		const headerTitleStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 8,
			fontSize: 14,
			fontWeight: 600,
			lineHeight: "20px"
		};
		const headerBadgeBase = {
			display: "inline-flex",
			alignItems: "center",
			gap: 4,
			whiteSpace: "nowrap",
			fontSize: 10,
			fontWeight: 500,
			lineHeight: "16px",
			padding: "0 5px",
			borderRadius: 3,
			border: "1px solid transparent"
		};
		const headerBadgeLlm = {
			color: "var(--dsw-alias-label-secondary)",
			borderColor: "var(--dsw-alias-border-l2)",
			background: "transparent"
		};
		const headerBadgeAgent = {
			color: "var(--dsw-alias-bg-layer-1)",
			borderColor: "var(--dsw-alias-label-primary)",
			background: "var(--dsw-alias-label-primary)"
		};
		const headerSummaryStyle = {
			fontSize: 11,
			lineHeight: "16px",
			color: "var(--dsw-alias-label-tertiary)",
			whiteSpace: "nowrap",
			overflow: "hidden",
			textOverflow: "ellipsis"
		};
		const headerMiniStyle = {
			width: 172,
			flex: "none",
			minWidth: 0
		};
		const headerStatusStyle = {
			width: 96,
			flex: "none",
			textAlign: "right",
			fontSize: 11,
			lineHeight: "16px",
			color: "var(--dsw-alias-label-tertiary)",
			whiteSpace: "nowrap",
			overflow: "hidden",
			textOverflow: "ellipsis"
		};
		const headerSideStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 10,
			flex: "none"
		};
		const headerUnsavedStyle = {
			fontSize: 12,
			color: "var(--dsw-alias-label-tertiary)"
		};
		const headerChevronStyle = {
			width: 15,
			fontSize: 20,
			lineHeight: 1,
			textAlign: "center",
			color: "var(--dsw-alias-label-tertiary)"
		};
		/**
		* Monochrome role badge: outlined message glyph for LLM, filled terminal glyph
		* for Agent. Shared by migrated card headers and the shell legacy fallback.
		*/
		function ProviderRoleBadge(props) {
			const agent = (props.role ?? "llm") === "agent";
			return (0, react_jsx_runtime.jsxs)("span", {
				"data-provider-role-badge": agent ? "agent" : "llm",
				style: {
					...headerBadgeBase,
					...agent ? headerBadgeAgent : headerBadgeLlm
				},
				children: [(0, react_jsx_runtime.jsx)("svg", {
					viewBox: "0 0 16 16",
					fill: "none",
					stroke: "currentColor",
					strokeWidth: 1.4,
					"aria-hidden": "true",
					children: agent ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("rect", {
						x: "1.5",
						y: "2",
						width: "13",
						height: "12",
						rx: "2"
					}), (0, react_jsx_runtime.jsx)("path", { d: "m4 5 3 3-3 3m5 0h3" })] }) : (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("rect", {
						x: "2",
						y: "2",
						width: "12",
						height: "9",
						rx: "3"
					}), (0, react_jsx_runtime.jsx)("path", { d: "m5 11-1 3 5-3M5 6h6" })] })
				}), agent ? "Agent" : "LLM"]
			});
		}
		/**
		* Approved A header geometry in one row: identity (mark beside title, badge,
		* and count) on the left, headline quota at the right, caller status, and the
		* chevron. Narrow screens stack identity plus chevron over quota plus status.
		* Renders a fragment for the caller-owned header button; props keep the legacy
		* codex provider-chrome signature so existing call sites keep working.
		*/
		function ProviderCardHeader(props) {
			const quota = props.quota === void 0 || props.quota === null ? void 0 : {
				...props.quota.remainingPercent === void 0 ? {} : { remainingPercent: props.quota.remainingPercent },
				...props.quota.remainingFraction === void 0 ? {} : { remainingFraction: props.quota.remainingFraction },
				...props.quota.label === void 0 ? {} : { label: props.quota.label },
				...props.quota.detail === void 0 ? {} : { detail: props.quota.detail }
			};
			return (0, react_jsx_runtime.jsxs)("span", {
				"data-provider-header-main": "",
				style: headerMainStyle,
				children: [
					(0, react_jsx_runtime.jsxs)("span", {
						"data-provider-header-identity": "",
						style: headerIdentityStyle,
						children: [(0, react_jsx_runtime.jsx)("span", {
							"data-provider-header-mark": "",
							style: headerMarkStyle,
							children: props.mark
						}), (0, react_jsx_runtime.jsxs)("span", {
							style: headerTitleColStyle,
							children: [(0, react_jsx_runtime.jsxs)("span", {
								style: headerTitleStyle,
								children: [(0, react_jsx_runtime.jsx)("span", { children: props.title }), (0, react_jsx_runtime.jsx)(ProviderRoleBadge, { ...props.role === void 0 ? {} : { role: props.role } })]
							}), (0, react_jsx_runtime.jsx)("span", {
								"data-provider-header-summary": "",
								style: headerSummaryStyle,
								children: props.summary
							})]
						})]
					}),
					quota === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
						"data-provider-quota-mini": "",
						style: headerMiniStyle,
						children: (0, react_jsx_runtime.jsx)(ProviderQuotaMeter, { ...quota })
					}),
					props.status === void 0 ? null : (0, react_jsx_runtime.jsx)("span", {
						"data-provider-header-status": "",
						style: headerStatusStyle,
						children: props.status
					}),
					(0, react_jsx_runtime.jsxs)("span", {
						"data-provider-header-side": "",
						style: headerSideStyle,
						children: [props.unsaved === true && props.unsavedLabel !== void 0 ? (0, react_jsx_runtime.jsx)("span", {
							style: headerUnsavedStyle,
							children: props.unsavedLabel
						}) : null, (0, react_jsx_runtime.jsx)("span", {
							"data-provider-header-chevron": "",
							"aria-hidden": "true",
							style: {
								...headerChevronStyle,
								transform: props.open ? "rotate(180deg)" : "none"
							},
							children: "⌄"
						})]
					})
				]
			});
		}
		/**
		* Scoped provider chrome CSS: plain card reset, header button layout, body and
		* model rows, quota meter responsive rules, and coarse-pointer touch targets.
		* The shell injects it once per page; provider cards may also inject it once
		* for standalone use. Duplicate style tags are harmless: every rule is scoped
		* to a data-provider-* attribute; shared geometry overrides legacy inline layout styles.
		*/
		const providerUiCss = [
			"[data-provider-card]{box-sizing:border-box;width:100%;min-width:0;list-style:none;margin:0!important;border:0!important;border-radius:0!important;background:none!important;box-shadow:none!important;overflow:visible}",
			"[data-provider-card-header]{box-sizing:border-box;width:100%;min-height:76px!important;display:flex;align-items:center;justify-content:space-between;gap:16px;border:0;padding:12px 14px!important;background:transparent;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer}",
			"[data-provider-body][hidden]{display:none!important}",
			"[data-provider-role-badge] svg{width:12px;height:12px}",
			"[data-provider-card-header]:hover{background:color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent)}",
			"[data-provider-body]{display:flex;flex-direction:column;gap:18px;border-top:1px solid var(--dsw-alias-border-l2);padding:16px 14px 18px}",
			"[data-provider-model]{display:flex;align-items:center;gap:9px;min-height:40px}",
			"[data-provider-quota-mini]{display:block}",
			"[data-providers-list]{display:flex;flex-direction:column}",
			"[data-providers-list] [data-sortable-row]+[data-sortable-row]{border-top:1px solid var(--dsw-alias-border-l2)}",
			"[data-providers-section]{container-type:inline-size}",
			"@media (max-width:680px){[data-provider-card-header]{min-height:106px!important;padding:17px 4px!important}[data-provider-header-main]{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:7px 9px!important;align-items:center}[data-provider-header-identity]{grid-column:1;grid-row:1;gap:9px!important}[data-provider-header-mark]{width:25px!important;height:25px!important}[data-provider-role-badge]{margin-left:4px;font-size:9px!important}[data-provider-role-badge] svg{width:11px!important;height:11px!important}[data-provider-header-side]{grid-column:2;grid-row:1;justify-self:end}[data-provider-header-side] [data-provider-header-chevron]{width:18px}[data-provider-quota-mini]{grid-column:1;grid-row:2;width:auto!important;max-width:none!important;text-align:left;padding-left:34px!important}[data-provider-header-status]{grid-column:2;grid-row:2;width:auto!important;max-width:100px}[data-provider-model]{min-height:48px}[data-provider-model] input[type=checkbox]{width:17px;height:17px}[data-providers-section] button,[data-provider-card] button{min-height:44px}}",
			"@container (max-width:540px){[data-provider-card-header]{min-height:106px!important;padding:17px 4px!important}[data-provider-header-main]{display:grid!important;grid-template-columns:minmax(0,1fr) auto;gap:7px 9px!important;align-items:center}[data-provider-header-identity]{grid-column:1;grid-row:1;gap:9px!important}[data-provider-header-mark]{width:25px!important;height:25px!important}[data-provider-role-badge]{margin-left:4px;font-size:9px!important}[data-provider-role-badge] svg{width:11px!important;height:11px!important}[data-provider-header-side]{grid-column:2;grid-row:1;justify-self:end}[data-provider-header-side] [data-provider-header-chevron]{width:18px}[data-provider-quota-mini]{grid-column:1;grid-row:2;width:auto!important;max-width:none!important;text-align:left;padding-left:34px!important}[data-provider-header-status]{grid-column:2;grid-row:2;width:auto!important;max-width:100px}[data-provider-model]{min-height:48px}[data-provider-model] input[type=checkbox]{width:17px;height:17px}[data-providers-section] button,[data-provider-card] button{min-height:44px}}",
			"@media (pointer:coarse){[data-sortable-handle],[data-sortable-move]{min-width:44px;min-height:44px}}"
		].join("\n");
		//#endregion
		//#region src/client/provider-chrome.tsx
		/** Standard compact usage reset caption. */
		function UsageResetAt(props) {
			return props.label === void 0 || props.label.length === 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: {
					margin: 0,
					fontSize: 12,
					lineHeight: "18px",
					color: "var(--dsw-alias-label-tertiary)"
				},
				children: props.label
			});
		}
		/** Standard last-updated caption. */
		function UsageUpdatedAt(props) {
			return props.at === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: {
					margin: 0,
					textAlign: "right",
					fontSize: 12,
					lineHeight: "18px",
					color: "var(--dsw-alias-label-tertiary)"
				},
				children: props.label
			});
		}
		/** Standard usage section heading and refresh action. */
		function UsageHeader(props) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					gap: 10
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
					style: {
						margin: 0,
						fontSize: 14,
						fontWeight: 600,
						lineHeight: "20px"
					},
					children: props.title
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					disabled: props.disabled === true,
					"aria-label": props.spinning ? props.busyLabel : props.refreshLabel,
					onClick: props.onRefresh,
					style: {
						minHeight: 28,
						border: "1px solid var(--dsw-alias-border-l2)",
						borderRadius: 14,
						padding: "3px 10px",
						background: "transparent",
						color: "var(--dsw-alias-label-primary)",
						cursor: props.disabled === true ? "default" : "pointer",
						font: "inherit",
						fontSize: 12
					},
					children: props.spinning ? props.busyLabel : props.refreshLabel
				})]
			});
		}
		/** Standard loading bars for provider usage. */
		function UsageSkeleton(props) {
			const rows = props.rows ?? 2;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 10
				},
				"aria-hidden": "true",
				children: Array.from({ length: rows }, (_, index) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						gap: 6
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
						display: "block",
						width: index === 0 ? 110 : 82,
						height: 12,
						borderRadius: 4,
						background: "color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent)"
					} }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { style: {
						display: "block",
						width: "100%",
						height: 14,
						borderRadius: 999,
						background: "color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent)"
					} })]
				}, index))
			});
		}
		//#endregion
		//#region node_modules/.pnpm/dsh-llm-providers-ui@https+++github.com+NOirBRight+dsh-llm-providers-ui+releases+downlo_9fe3bd448b199fdcbe5d71b8de10bff6/node_modules/dsh-llm-providers-ui/lib/sortable.js
		/** Pointer-driven sortable list with a floating ghost and animated live preview. */
		const listStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 8
		};
		const rowStyle$1 = {
			display: "grid",
			gridTemplateColumns: "30px minmax(0, 1fr)",
			alignItems: "stretch",
			overflow: "hidden",
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 8,
			background: "var(--dsw-alias-bg-layer-1)",
			transition: "box-shadow 150ms ease, opacity 150ms ease, transform 150ms ease"
		};
		const handleStyle = {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			width: 30,
			minHeight: 42,
			alignSelf: "stretch",
			border: 0,
			borderRight: "1px solid var(--dsw-alias-border-l2)",
			padding: 0,
			flex: "none",
			touchAction: "none",
			userSelect: "none",
			background: "transparent",
			color: "var(--dsw-alias-label-tertiary)",
			position: "relative",
			zIndex: 2
		};
		const cardRowStyle = {
			...rowStyle$1,
			borderRadius: 10,
			background: "var(--dsw-alias-bg-module-platform)",
			overflow: "hidden"
		};
		const cardItemStyle = {
			minWidth: 0,
			display: "flex",
			flexDirection: "column"
		};
		const plainRowStyle = {
			display: "grid",
			alignItems: "stretch",
			background: "transparent"
		};
		const plainItemStyle = {
			minWidth: 0,
			display: "flex",
			flexDirection: "column",
			padding: "4px 0"
		};
		const moveButtonStyle = {
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			minWidth: 34,
			minHeight: 34,
			alignSelf: "center",
			border: 0,
			padding: 0,
			flex: "none",
			background: "transparent",
			color: "var(--dsw-alias-label-tertiary)",
			fontSize: 16,
			cursor: "pointer"
		};
		const touchCss = "@media (pointer:coarse){[data-sortable-handle],[data-sortable-move]{min-width:44px;min-height:44px}}";
		const cardCss = "[data-sortable-card] [data-sortable-item] li,[data-sortable-ghost] [data-sortable-item] li{border:0!important;border-radius:0!important;background:transparent!important;overflow:visible!important;list-style:none;margin:0}";
		/** Grip glyph marking one row's pointer handle. */
		function IconGrip() {
			return (0, react_jsx_runtime.jsxs)("svg", {
				width: "10",
				height: "14",
				viewBox: "0 0 10 14",
				fill: "currentColor",
				"aria-hidden": true,
				children: [
					(0, react_jsx_runtime.jsx)("circle", {
						cx: "2.5",
						cy: "2.5",
						r: "1.2"
					}),
					(0, react_jsx_runtime.jsx)("circle", {
						cx: "7.5",
						cy: "2.5",
						r: "1.2"
					}),
					(0, react_jsx_runtime.jsx)("circle", {
						cx: "2.5",
						cy: "7",
						r: "1.2"
					}),
					(0, react_jsx_runtime.jsx)("circle", {
						cx: "7.5",
						cy: "7",
						r: "1.2"
					}),
					(0, react_jsx_runtime.jsx)("circle", {
						cx: "2.5",
						cy: "11.5",
						r: "1.2"
					}),
					(0, react_jsx_runtime.jsx)("circle", {
						cx: "7.5",
						cy: "11.5",
						r: "1.2"
					})
				]
			});
		}
		/**
		* Pointer-driven sortable list: an in-tree floating ghost follows the pointer,
		* a preview array records the prospective order, and FLIP animations move
		* sibling rows. The ghost stays inside the list ancestry so ancestor-scoped
		* row styles keep matching it while it floats (position:fixed escapes
		* overflow clipping without leaving the scope). Constraint: no
		* transform/filter/perspective on list ancestors, which would re-anchor
		* the fixed ghost to that ancestor instead of the viewport.
		*/
		function SortableList({ items, getId, renderItem, dragLabel, onReorder, disabled = false, chrome = "row", sorting = true, moveButtons = false, moveUpLabel, moveDownLabel }) {
			const card = chrome === "card";
			const plain = chrome === "plain";
			const interactive = sorting && !disabled;
			const showHandle = sorting;
			const upLabel = moveUpLabel ?? (() => "Move up");
			const downLabel = moveDownLabel ?? (() => "Move down");
			/** Commit a durable reorder moving one row by an offset. Pointer preview stays untouched. */
			const moveBy = (id, offset) => {
				if (!interactive || draggedId !== null) return;
				const from = items.findIndex((item) => getId(item) === id);
				if (from < 0) return;
				const to = from + offset;
				if (to < 0 || to >= items.length) return;
				const next = [...items];
				const moved = next.splice(from, 1)[0];
				if (moved === void 0) return;
				next.splice(to, 0, moved);
				onReorder(next);
			};
			/** Arrow keys on a handle commit the same reorder as a pointer drag. */
			const handleKeyDown = (event, id) => {
				if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
				event.preventDefault();
				moveBy(id, event.key === "ArrowUp" ? -1 : 1);
			};
			const [draggedId, setDraggedId] = (0, react.useState)(null);
			const [dropTargetId, setDropTargetId] = (0, react.useState)(null);
			const [previewItems, setPreviewItems] = (0, react.useState)(null);
			const [dragGhost, setDragGhost] = (0, react.useState)(null);
			const rowRefs = (0, react.useRef)(/* @__PURE__ */ new Map());
			const previousRects = (0, react.useRef)(null);
			const previewRef = (0, react.useRef)(null);
			const dragGhostRef = (0, react.useRef)(null);
			const renderedItems = previewItems ?? items;
			const draggedItem = draggedId === null ? void 0 : renderedItems.find((item) => getId(item) === draggedId) ?? items.find((item) => getId(item) === draggedId);
			(0, react.useEffect)(() => {
				if (draggedId === null) return;
				const style = document.createElement("style");
				style.textContent = "html.providers-sortable-dragging, html.providers-sortable-dragging * { cursor: grabbing !important; user-select: none !important; }";
				const previousRootCursor = document.documentElement.style.cursor;
				const previousBodyCursor = document.body.style.cursor;
				document.head.appendChild(style);
				document.documentElement.classList.add("providers-sortable-dragging");
				document.documentElement.style.cursor = "grabbing";
				document.body.style.cursor = "grabbing";
				return () => {
					document.documentElement.classList.remove("providers-sortable-dragging");
					style.remove();
					document.documentElement.style.cursor = previousRootCursor;
					document.body.style.cursor = previousBodyCursor;
				};
			}, [draggedId]);
			(0, react.useEffect)(() => {
				if (draggedId === null) return;
				const handlePointerMove = (event) => {
					const currentGhost = dragGhostRef.current;
					if (currentGhost === null) return;
					event.preventDefault();
					const nextGhost = {
						...currentGhost,
						x: event.clientX - currentGhost.offsetX,
						y: event.clientY - currentGhost.offsetY
					};
					dragGhostRef.current = nextGhost;
					setDragGhost(nextGhost);
					movePreviewFromPointer(nextGhost.y + nextGhost.height / 2);
				};
				const handlePointerUp = (event) => {
					event.preventDefault();
					finishDrag(true);
				};
				const handlePointerCancel = (event) => {
					event.preventDefault();
					finishDrag(false);
				};
				const handleKeyDown = (event) => {
					if (event.key !== "Escape") return;
					event.preventDefault();
					finishDrag(false);
				};
				window.addEventListener("pointermove", handlePointerMove, { passive: false });
				window.addEventListener("pointerup", handlePointerUp, { passive: false });
				window.addEventListener("pointercancel", handlePointerCancel, { passive: false });
				window.addEventListener("keydown", handleKeyDown);
				return () => {
					window.removeEventListener("pointermove", handlePointerMove);
					window.removeEventListener("pointerup", handlePointerUp);
					window.removeEventListener("pointercancel", handlePointerCancel);
					window.removeEventListener("keydown", handleKeyDown);
				};
			}, [draggedId]);
			(0, react.useLayoutEffect)(() => {
				const rects = previousRects.current;
				if (rects === null) return;
				previousRects.current = null;
				rowRefs.current.forEach((node, id) => {
					const previous = rects.get(id);
					if (previous === void 0) return;
					const next = node.getBoundingClientRect();
					const deltaX = previous.left - next.left;
					const deltaY = previous.top - next.top;
					if (deltaX === 0 && deltaY === 0 || typeof node.animate !== "function") return;
					node.animate([{ transform: "translate(" + String(deltaX) + "px, " + String(deltaY) + "px)" }, { transform: "translate(0, 0)" }], {
						duration: 160,
						easing: "cubic-bezier(0.2, 0, 0, 1)"
					});
				});
			}, [renderedItems]);
			const startDrag = (event, id) => {
				if (!interactive || dragGhostRef.current !== null) return;
				if (event.pointerType === "mouse" && event.button !== 0) return;
				const row = event.currentTarget.closest("[data-sortable-row=\"true\"]");
				if (!(row instanceof HTMLElement)) return;
				event.preventDefault();
				if (typeof event.currentTarget.focus === "function") event.currentTarget.focus();
				try {
					event.currentTarget.setPointerCapture(event.pointerId);
				} catch {}
				const rect = row.getBoundingClientRect();
				const nextGhost = {
					id,
					x: rect.left,
					y: rect.top,
					width: rect.width,
					height: rect.height,
					offsetX: event.clientX - rect.left,
					offsetY: event.clientY - rect.top
				};
				dragGhostRef.current = nextGhost;
				const initial = [...items];
				previewRef.current = initial;
				setPreviewItems(initial);
				setDragGhost(nextGhost);
				setDraggedId(id);
			};
			const finishDrag = (commit) => {
				const next = previewRef.current;
				if (commit && next !== null && !sameOrder(next, items, getId)) onReorder(next);
				previewRef.current = null;
				dragGhostRef.current = null;
				setPreviewItems(null);
				setDragGhost(null);
				setDraggedId(null);
				setDropTargetId(null);
			};
			const captureRects = () => {
				previousRects.current = new Map(Array.from(rowRefs.current.entries()).map(([id, node]) => [id, node.getBoundingClientRect()]));
			};
			const setRowRef = (id, node) => {
				if (node === null) rowRefs.current.delete(id);
				else rowRefs.current.set(id, node);
			};
			/** The ghost clones live row controls: keep the copy unfocusable. React 18 types no inert prop, so set the DOM flag behind a support guard. */
			const setGhostInert = (node) => {
				if (node !== null && "inert" in node) node.inert = true;
			};
			const movePreviewFromPointer = (pointerY) => {
				if (draggedId === null) return;
				const current = previewRef.current ?? [...items];
				const from = current.findIndex((item) => getId(item) === draggedId);
				if (from < 0) return;
				const dragged = current[from];
				if (dragged === void 0) return;
				const remaining = current.filter((item) => getId(item) !== draggedId);
				let insertionIndex = remaining.length;
				let nextDropTargetId = remaining.length === 0 ? null : getId(remaining[remaining.length - 1]);
				for (let index = 0; index < remaining.length; index += 1) {
					const item = remaining[index];
					if (item === void 0) continue;
					const id = getId(item);
					const node = rowRefs.current.get(id);
					if (node === void 0) continue;
					const rect = node.getBoundingClientRect();
					if (pointerY < rect.top + rect.height / 2) {
						insertionIndex = index;
						nextDropTargetId = id;
						break;
					}
				}
				const next = [
					...remaining.slice(0, insertionIndex),
					dragged,
					...remaining.slice(insertionIndex)
				];
				setDropTargetId(nextDropTargetId);
				if (sameOrder(next, current, getId)) return;
				captureRects();
				previewRef.current = next;
				setPreviewItems(next);
			};
			const rowChromeStyle = plain ? plainRowStyle : card ? cardRowStyle : rowStyle$1;
			const rowGridColumns = (showHandle ? "44px " : "") + "minmax(0,1fr)" + (moveButtons && showHandle ? " auto auto" : "");
			const rowItemStyle = plain ? plainItemStyle : card ? cardItemStyle : { minWidth: 0 };
			return (0, react_jsx_runtime.jsxs)("div", {
				"data-sortable-card": card ? "" : void 0,
				"data-sortable-plain": plain ? "" : void 0,
				style: {
					...listStyle,
					...card ? { gap: 12 } : {},
					...plain ? { gap: 0 } : {}
				},
				children: [
					card ? (0, react_jsx_runtime.jsx)("style", { children: cardCss }) : null,
					plain || moveButtons ? (0, react_jsx_runtime.jsx)("style", { children: touchCss }) : null,
					renderedItems.map((item, index) => {
						const id = getId(item);
						const dragging = draggedId === id;
						const targeted = dropTargetId === id && draggedId !== id;
						return (0, react_jsx_runtime.jsxs)("div", {
							ref: (node) => {
								setRowRef(id, node);
							},
							"data-sortable-row": "true",
							style: {
								...rowChromeStyle,
								gridTemplateColumns: rowGridColumns,
								visibility: dragging ? "hidden" : "visible",
								pointerEvents: dragging ? "none" : "auto",
								borderColor: dragging ? "transparent" : "var(--dsw-alias-border-l2)",
								boxShadow: targeted ? "0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-business-primary) 20%, transparent)" : "none"
							},
							onPointerDown: (event) => {
								const target = event.target;
								if (target instanceof Element && target.closest("a, input, select, textarea, label, button:not([data-sortable-handle])") !== null) return;
								startDrag(event, id);
							},
							children: [
								(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"data-sortable-handle": "",
									style: {
										...handleStyle,
										display: showHandle ? "flex" : "none",
										...plain ? { borderRight: 0 } : {},
										cursor: disabled ? "default" : draggedId === null ? "grab" : "grabbing"
									},
									"aria-label": dragLabel(item, index),
									"aria-grabbed": dragging,
									title: dragLabel(item, index),
									disabled,
									hidden: !showHandle,
									onDragStart: (event) => {
										event.preventDefault();
									},
									onPointerDown: (event) => {
										startDrag(event, id);
									},
									onKeyDown: (event) => {
										handleKeyDown(event, id);
									},
									children: (0, react_jsx_runtime.jsx)(IconGrip, {})
								}),
								(0, react_jsx_runtime.jsx)("div", {
									"data-sortable-item": "",
									style: rowItemStyle,
									children: renderItem(item, index)
								}),
								moveButtons ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"data-sortable-move": "up",
									style: {
										...moveButtonStyle,
										display: showHandle ? "inline-flex" : "none"
									},
									"aria-label": upLabel(item, index),
									title: upLabel(item, index),
									disabled: !interactive || index === 0,
									hidden: !showHandle,
									onClick: () => {
										moveBy(id, -1);
									},
									children: "↑"
								}), (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									"data-sortable-move": "down",
									style: {
										...moveButtonStyle,
										display: showHandle ? "inline-flex" : "none"
									},
									"aria-label": downLabel(item, index),
									title: downLabel(item, index),
									disabled: !interactive || index === renderedItems.length - 1,
									hidden: !showHandle,
									onClick: () => {
										moveBy(id, 1);
									},
									children: "↓"
								})] }) : null
							]
						}, id);
					}),
					dragGhost !== null && draggedItem !== void 0 ? (0, react_jsx_runtime.jsxs)("div", {
						"data-sortable-row": "true",
						"data-sortable-ghost": "true",
						"aria-hidden": "true",
						ref: setGhostInert,
						style: {
							...rowChromeStyle,
							gridTemplateColumns: rowGridColumns,
							position: "fixed",
							boxSizing: "border-box",
							left: dragGhost.x,
							top: dragGhost.y,
							width: dragGhost.width,
							minHeight: dragGhost.height,
							zIndex: 1e4,
							pointerEvents: "none",
							opacity: .96,
							boxShadow: "var(--dsw-shadow-lv2, 0 10px 30px rgba(0, 0, 0, 0.18))",
							outline: "2px solid color-mix(in srgb, var(--dsw-alias-state-business-primary) 22%, transparent)"
						},
						children: [
							(0, react_jsx_runtime.jsx)("div", {
								"data-sortable-handle": "",
								style: {
									...handleStyle,
									display: showHandle ? "flex" : "none",
									...plain ? { borderRight: 0 } : {},
									cursor: "grabbing"
								},
								children: (0, react_jsx_runtime.jsx)(IconGrip, {})
							}),
							(0, react_jsx_runtime.jsx)("div", {
								"data-sortable-item": "",
								style: rowItemStyle,
								children: renderItem(draggedItem, renderedItems.findIndex((item) => getId(item) === draggedId))
							}),
							moveButtons && showHandle ? (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [(0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									...moveButtonStyle,
									visibility: "hidden"
								},
								children: "↑"
							}), (0, react_jsx_runtime.jsx)("span", {
								"aria-hidden": "true",
								style: {
									...moveButtonStyle,
									visibility: "hidden"
								},
								children: "↓"
							})] }) : null
						]
					}) : null
				]
			});
		}
		function sameOrder(left, right, getId) {
			return left.length === right.length && left.every((item, index) => {
				const other = right[index];
				return other !== void 0 && getId(item) === getId(other);
			});
		}
		//#endregion
		//#region src/client/model-catalog-ui.tsx
		const inputStyle = {
			boxSizing: "border-box",
			width: "100%",
			minHeight: 36,
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 8,
			padding: "7px 10px",
			background: "var(--dsw-alias-bg-layer-1)",
			color: "var(--dsw-alias-label-primary)",
			font: "inherit"
		};
		const rowInputStyle = {
			...inputStyle,
			minHeight: 32,
			padding: "4px 10px"
		};
		const selectStyle = {
			boxSizing: "border-box",
			minHeight: 32,
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 8,
			padding: "4px 28px 4px 10px",
			backgroundColor: "var(--dsw-alias-bg-layer-1)",
			color: "var(--dsw-alias-label-primary)",
			font: "inherit",
			appearance: "none",
			backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
			backgroundRepeat: "no-repeat",
			backgroundPosition: "right 8px center"
		};
		const rowStyle = {
			display: "grid",
			gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
			gap: 10
		};
		const modelContentStyle = {
			display: "grid",
			gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) auto auto",
			alignItems: "center",
			gap: 6,
			padding: "6px 8px"
		};
		const modelDetailStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 10,
			borderTop: "1px solid var(--dsw-alias-border-l2)",
			padding: "10px 4px 4px"
		};
		const capabilitiesStyle = {
			display: "flex",
			alignItems: "center",
			flexWrap: "wrap",
			gap: 14
		};
		const fieldStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 6
		};
		const labelStyle = {
			fontSize: 13,
			color: "var(--dsw-alias-label-secondary)"
		};
		/** Small interface that hides the shared styles behind layout components. */
		function ModelCatalogDetails({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: {
					...modelDetailStyle,
					gridColumn: "1 / -1"
				},
				children
			});
		}
		function ModelCatalogRow({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: rowStyle,
				children
			});
		}
		function ModelCatalogCapabilities({ children }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
				style: capabilitiesStyle,
				children
			});
		}
		function Capability$1({ label, checked, disabled, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: {
					...labelStyle,
					display: "inline-flex",
					alignItems: "center",
					gap: 6
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked,
					disabled,
					onChange: (event) => onChange(event.target.checked)
				}), label]
			});
		}
		/**
		* Helper that renders the accepted model expansion visuals:
		* first row (context window) then second row (Vision, Reasoning/Thinking, Default thinking select conditional).
		* Preserves 36h for context, 32h for row/select, flex column gap10, grid 2cols, flex wrap gap14, custom arrow.
		*/
		function ModelCatalogFields(props) {
			const { contextWindow, contextLabel, contextPlaceholder, onContextWindowChange, visionChecked, visionLabel, onVisionChange, thinkingChecked, thinkingLabel, thinkingDisabled, onThinkingChange, defaultThinkingLabel, defaultThinkingValue, defaultThinkingOptions, onDefaultThinkingChange, getOptionLabel, showDefaultThinking, disabled } = props;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ModelCatalogDetails, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelCatalogRow, { children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: {
					...fieldStyle,
					gridColumn: "1 / -1"
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: labelStyle,
					children: contextLabel
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					style: inputStyle,
					inputMode: "numeric",
					value: contextWindow,
					placeholder: contextPlaceholder,
					disabled,
					"aria-label": contextLabel,
					onChange: (event) => onContextWindowChange(event.target.value)
				})]
			}) }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(ModelCatalogCapabilities, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Capability$1, {
					label: visionLabel,
					checked: visionChecked,
					disabled,
					onChange: onVisionChange
				}),
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Capability$1, {
					label: thinkingLabel,
					checked: thinkingChecked,
					disabled: disabled || thinkingDisabled,
					onChange: onThinkingChange
				}),
				showDefaultThinking ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
					style: {
						display: "inline-flex",
						alignItems: "center",
						gap: 6,
						...labelStyle
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: labelStyle,
						children: defaultThinkingLabel
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
						style: selectStyle,
						value: defaultThinkingValue ?? defaultThinkingOptions[0] ?? "",
						disabled,
						"aria-label": defaultThinkingLabel,
						onChange: (event) => onDefaultThinkingChange?.(event.target.value),
						children: defaultThinkingOptions.map((option) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
							value: option,
							children: getOptionLabel ? getOptionLabel(option) : option
						}, option))
					})]
				}) : null
			] })] });
		}
		//#endregion
		//#region src/client/CommandCodeSettingsCard.tsx
		/** Command Code provider card using the shared DSH provider layout. */
		const cardStyle = { overflow: "visible" };
		const bodyStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 18,
			borderTop: "1px solid var(--dsw-alias-border-l2)",
			padding: "16px 14px 18px"
		};
		const sectionStyle = {
			display: "flex",
			flexDirection: "column",
			gap: 12
		};
		const sectionTitleStyle = {
			margin: 0,
			fontSize: 14,
			lineHeight: "20px",
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary)"
		};
		const hintStyle = {
			margin: 0,
			fontSize: 12,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-tertiary)"
		};
		const actionsStyle = {
			display: "flex",
			alignItems: "center",
			justifyContent: "flex-end",
			gap: 10
		};
		const buttonStyle = {
			minHeight: 34,
			border: "1px solid var(--dsw-alias-border-l2)",
			borderRadius: 18,
			padding: "6px 14px",
			background: "var(--dsw-alias-bg-layer-1)",
			color: "var(--dsw-alias-label-primary)",
			font: "inherit",
			cursor: "pointer"
		};
		const primaryButtonStyle = {
			...buttonStyle,
			borderColor: "var(--dsw-alias-button-primary-fill)",
			background: "var(--dsw-alias-button-primary-fill)",
			color: "var(--dsw-alias-label-primary-foreground)"
		};
		const iconButtonStyle = {
			boxSizing: "border-box",
			width: 28,
			height: 28,
			display: "inline-flex",
			alignItems: "center",
			justifyContent: "center",
			flex: "none",
			border: 0,
			borderRadius: 6,
			padding: 0,
			background: "transparent",
			color: "var(--dsw-alias-label-tertiary)",
			font: "inherit",
			cursor: "pointer"
		};
		const disclosureStyle = {
			display: "inline-flex",
			alignItems: "center",
			gap: 8,
			minWidth: 0,
			border: 0,
			padding: 0,
			background: "transparent",
			color: "var(--dsw-alias-label-primary)",
			font: "inherit",
			textAlign: "left",
			cursor: "pointer"
		};
		const statusStyle = {
			margin: 0,
			fontSize: 13,
			lineHeight: "18px",
			color: "var(--dsw-alias-label-secondary)"
		};
		const errorStyle = {
			...statusStyle,
			color: "var(--dsw-alias-state-error-primary)"
		};
		let nextModelRow = 0;
		function newModelRowId() {
			nextModelRow += 1;
			return "commandcode-model-row-" + String(nextModelRow);
		}
		function modelDraftOf(model) {
			const hasEfforts = effortsForCommandCodeModel(model).length > 0;
			const vision = model.inputModalities?.includes("image") ?? false;
			const thinking = model.thinking === false ? false : model.thinking === true ? true : hasEfforts ? void 0 : void 0;
			const defaultEffort = model.thinking === false ? void 0 : defaultEffortForCommandCodeModel(model);
			return {
				rowId: newModelRowId(),
				id: model.id,
				...model.name === void 0 ? {} : { name: model.name },
				...model.description === void 0 ? {} : { description: model.description },
				contextWindow: model.contextWindow === void 0 ? "" : String(model.contextWindow),
				...model.contextWindowOverride === void 0 ? {} : { contextWindowOverride: String(model.contextWindowOverride) },
				...model.maxTokens === void 0 ? {} : { maxTokens: String(model.maxTokens) },
				...defaultEffort === void 0 ? {} : { defaultEffort },
				...model.thinkingEfforts === void 0 || model.thinkingEfforts.length === 0 ? {} : { thinkingEfforts: [...model.thinkingEfforts] },
				...vision ? { vision: true } : {},
				...thinking === void 0 ? {} : { thinking }
			};
		}
		function draftOf(settings) {
			return {
				zeroDataRetention: settings.zeroDataRetention,
				models: settings.models.map(modelDraftOf)
			};
		}
		function integerOf(text) {
			if (text.trim().length === 0) return void 0;
			const value = Number(text);
			return Number.isSafeInteger(value) && value > 0 ? value : NaN;
		}
		function sameDraft(left, right) {
			return JSON.stringify(left) === JSON.stringify(right);
		}
		function modelSettingsOf(draft) {
			const contextWindow = integerOf(draft.contextWindow);
			const contextWindowOverride = draft.contextWindowOverride === void 0 ? void 0 : integerOf(draft.contextWindowOverride);
			const maxTokens = draft.maxTokens === void 0 ? void 0 : integerOf(draft.maxTokens);
			const thinking = draft.thinking;
			const overlayEfforts = draft.thinkingEfforts === void 0 || draft.thinkingEfforts.length === 0 ? void 0 : draft.thinkingEfforts;
			const effortModel = thinking === false ? {
				id: draft.id.trim(),
				...overlayEfforts === void 0 ? {} : { thinkingEfforts: overlayEfforts }
			} : {
				id: draft.id.trim(),
				...draft.defaultEffort === void 0 ? {} : { defaultEffort: draft.defaultEffort },
				...overlayEfforts === void 0 ? {} : { thinkingEfforts: overlayEfforts }
			};
			const defaultEffort = thinking === false ? void 0 : defaultEffortForCommandCodeModel(effortModel);
			const inputModalities = draft.vision === true ? ["text", "image"] : void 0;
			return {
				id: draft.id.trim(),
				...draft.name === void 0 || draft.name.trim() === "" ? {} : { name: draft.name.trim() },
				...draft.description === void 0 || draft.description.trim() === "" ? {} : { description: draft.description.trim() },
				...contextWindow === void 0 || Number.isNaN(contextWindow) ? {} : { contextWindow },
				...contextWindowOverride === void 0 || Number.isNaN(contextWindowOverride) ? {} : { contextWindowOverride },
				...maxTokens === void 0 || Number.isNaN(maxTokens) ? {} : { maxTokens },
				...thinking === void 0 ? {} : { thinking },
				...defaultEffort === void 0 ? {} : { defaultEffort },
				...overlayEfforts === void 0 ? {} : { thinkingEfforts: overlayEfforts },
				...inputModalities === void 0 ? {} : { inputModalities }
			};
		}
		function settingsOf(draft, current) {
			return {
				...current,
				zeroDataRetention: draft.zeroDataRetention,
				models: draft.models.map(modelSettingsOf)
			};
		}
		function modelFailure(models) {
			const ids = /* @__PURE__ */ new Set();
			for (const model of models) {
				const id = model.id.trim();
				const context = integerOf(model.contextWindowOverride ?? model.contextWindow);
				if (id.length === 0 || ids.has(id) || context === void 0 || Number.isNaN(context)) return true;
				ids.add(id);
			}
			return false;
		}
		function messageOf(error, fallback) {
			return error instanceof Error && error.message.length > 0 ? error.message : fallback;
		}
		function interpolate(text, values) {
			return text.replace(/\{(\w+)\}/gu, (_match, key) => String(values[key] ?? ""));
		}
		function IconChevron({ open }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "12",
				height: "12",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				style: {
					flex: "none",
					transform: open ? "rotate(90deg)" : "none",
					transition: "transform 120ms ease"
				},
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M6 3.5 10.5 8 6 12.5",
					stroke: "currentColor",
					strokeWidth: "1.5",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function IconTrash() {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("svg", {
				width: "14",
				height: "14",
				viewBox: "0 0 16 16",
				fill: "none",
				"aria-hidden": "true",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
					d: "M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4M6.5 6.8v4.4M9.5 6.8v4.4",
					stroke: "currentColor",
					strokeWidth: "1.3",
					strokeLinecap: "round",
					strokeLinejoin: "round"
				})
			});
		}
		function Capability({ label, checked, disabled, onChange }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
				style: {
					...labelStyle,
					display: "inline-flex",
					alignItems: "center",
					gap: 6
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
					type: "checkbox",
					checked,
					disabled,
					onChange: (event) => onChange(event.target.checked)
				}), label]
			});
		}
		function ModelDetails(props) {
			const { model, disabled, t, patch } = props;
			const policyModel = {
				id: model.id,
				...model.defaultEffort === void 0 ? {} : { defaultEffort: model.defaultEffort },
				...model.thinkingEfforts === void 0 ? {} : { thinkingEfforts: model.thinkingEfforts }
			};
			const efforts = effortsForCommandCodeModel(policyModel);
			const defaultEffort = defaultEffortForCommandCodeModel(policyModel);
			const hasEfforts = efforts.length > 0;
			const thinkingChecked = hasEfforts ? model.thinking ?? true : false;
			const visionChecked = model.vision ?? false;
			const contextValue = model.contextWindowOverride ?? model.contextWindow ?? "";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelCatalogFields, {
				contextWindow: contextValue,
				contextLabel: t("contextWindow"),
				contextPlaceholder: t("useProviderContext"),
				onContextWindowChange: (value) => {
					if (value.trim() === "") patch({
						contextWindow: "",
						contextWindowOverride: void 0
					});
					else patch({
						contextWindow: value,
						contextWindowOverride: void 0
					});
				},
				visionChecked,
				visionLabel: t("vision"),
				onVisionChange: (value) => patch({ vision: value ? true : void 0 }),
				thinkingChecked,
				thinkingLabel: t("reasoning"),
				thinkingDisabled: !hasEfforts,
				onThinkingChange: (value) => patch({
					thinking: value ? true : false,
					...value ? {} : { defaultEffort: void 0 }
				}),
				defaultThinkingLabel: t("defaultThinking"),
				defaultThinkingValue: defaultEffort ?? efforts[0] ?? "",
				defaultThinkingOptions: efforts,
				onDefaultThinkingChange: (value) => patch({ defaultEffort: value }),
				getOptionLabel: (effort) => EFFORT_LABELS[effort] ?? effort,
				showDefaultThinking: hasEfforts && thinkingChecked,
				disabled
			});
		}
		function UsageBar({ label, window, t }) {
			const reset = window.resetAt === void 0 ? void 0 : interpolate(t("reset"), { time: new Date(window.resetAt).toLocaleString() });
			if (window.cap <= 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					alignItems: "baseline",
					justifyContent: "space-between",
					gap: 10
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					style: labelStyle,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					style: hintStyle,
					children: [
						"$" + window.used.toFixed(2),
						" / ",
						"$" + window.cap.toFixed(2)
					]
				})]
			});
			const remaining = 100 * (1 - window.used / window.cap);
			if (!Number.isFinite(remaining) || remaining < 0 || remaining > 100) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				style: {
					display: "flex",
					flexDirection: "column",
					gap: 6
				},
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "baseline",
						justifyContent: "space-between",
						gap: 10
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						style: labelStyle,
						children: label
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
						style: hintStyle,
						children: [
							"$" + window.used.toFixed(2),
							" / ",
							"$" + window.cap.toFixed(2)
						]
					})]
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageResetAt, { label: reset })]
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderQuotaMeter, {
				remainingPercent: Math.round(remaining * 10) / 10,
				label,
				...reset === void 0 ? {} : { detail: reset }
			});
		}
		function UsageContent({ state, t }) {
			if (state.status === "idle") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: hintStyle,
				children: t("quotaNoKey")
			});
			if (state.status === "loading") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageSkeleton, { rows: 2 });
			if (state.status === "unsupported") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: hintStyle,
				children: t("quotaUnsupported")
			});
			if (state.status === "error") return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				style: errorStyle,
				children: state.message
			});
			const usage = state.usage;
			const credits = usage.credits;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				usage.failures.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					style: errorStyle,
					children: [
						t("quotaFailed"),
						" — ",
						usage.failures.join("; ")
					]
				}) : null,
				usage.account !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					style: statusStyle,
					children: [
						t("account"),
						": ",
						usage.account.userName ?? usage.account.name ?? "—"
					]
				}) : null,
				usage.plan !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					style: statusStyle,
					children: [
						t("plan"),
						": ",
						usage.plan.name ?? usage.plan.planId ?? "—",
						usage.plan.status ? " (" + usage.plan.status + ")" : ""
					]
				}) : null,
				credits !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: {
							...rowStyle,
							gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 3
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: hintStyle,
									children: t("monthly")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: credits.monthlyCredits === void 0 ? "—" : "$" + credits.monthlyCredits.toFixed(2) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 3
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: hintStyle,
									children: t("purchased")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: credits.purchasedCredits === void 0 ? "—" : "$" + credits.purchasedCredits.toFixed(2) })]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: {
									display: "flex",
									flexDirection: "column",
									gap: 3
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									style: hintStyle,
									children: t("free")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("strong", { children: credits.freeCredits === void 0 ? "—" : "$" + credits.freeCredits.toFixed(2) })]
							})
						]
					}),
					credits.fiveHour === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageBar, {
						label: t("fiveHour"),
						window: credits.fiveHour,
						t
					}),
					credits.weekly === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageBar, {
						label: t("weekly"),
						window: credits.weekly,
						t
					})
				] }) : null,
				usage.summary?.totalCost === void 0 ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
					style: hintStyle,
					children: [
						t("summaryCost"),
						": ",
						"$" + usage.summary.totalCost.toFixed(2),
						" · ",
						t("summaryTokens"),
						": ",
						(usage.summary.totalTokensIn ?? 0) + (usage.summary.totalTokensOut ?? 0)
					]
				})
			] });
		}
		function mergeSelected(current, selected) {
			const existing = new Map(current.map((model) => [model.id.trim(), model]));
			return selected.map((model) => {
				const prior = existing.get(model.id);
				if (prior === void 0) return modelDraftOf(model);
				return {
					...modelDraftOf(model),
					rowId: prior.rowId,
					...prior.name === void 0 ? {} : { name: prior.name },
					...prior.description === void 0 ? {} : { description: prior.description },
					...prior.contextWindowOverride === void 0 ? {} : { contextWindowOverride: prior.contextWindowOverride },
					...prior.maxTokens === void 0 ? {} : { maxTokens: prior.maxTokens },
					...prior.defaultEffort === void 0 ? {} : { defaultEffort: prior.defaultEffort },
					...prior.vision === void 0 ? {} : { vision: prior.vision },
					...prior.thinking === void 0 ? {} : { thinking: prior.thinking }
				};
			});
		}
		function patchedModel(model, patch) {
			const next = { ...model };
			for (const [key, value] of Object.entries(patch)) {
				if (value === void 0) delete next[key];
				else next[key] = value;
				if (key === "thinking" && value === false) delete next.defaultEffort;
			}
			return next;
		}
		/** Headline remaining quota from real auth values; missing renders no meter, never zero. */
		function headlineQuotaOf(view, t) {
			const window = view?.credits?.weekly ?? view?.credits?.fiveHour;
			if (window === void 0 || window.cap <= 0) return void 0;
			const remaining = 100 * (1 - window.used / window.cap);
			if (!Number.isFinite(remaining) || remaining < 0 || remaining > 100) return void 0;
			return {
				remainingPercent: Math.round(remaining * 10) / 10,
				label: view?.credits?.weekly !== void 0 ? t("weekly") : t("fiveHour")
			};
		}
		/** Standard collapsible provider card. */
		function CommandCodeSettingsCard(props) {
			const { t } = props;
			const snapshot = props.useCommandCodeSettings((value) => value);
			const initial = (0, react.useMemo)(() => snapshot.value === void 0 ? void 0 : draftOf(snapshot.value), [snapshot.value]);
			const [open, setOpen] = (0, react.useState)(false);
			const [source, setSource] = (0, react.useState)(initial);
			const [draft, setDraft] = (0, react.useState)(initial);
			const [sourceRevision, setSourceRevision] = (0, react.useState)(snapshot.revision);
			const [apiKey, setApiKey] = (0, react.useState)("");
			const [credential, setCredential] = (0, react.useState)(void 0);
			const [busy, setBusy] = (0, react.useState)(false);
			const [fetching, setFetching] = (0, react.useState)(false);
			const [failure, setFailure] = (0, react.useState)(void 0);
			const [notice, setNotice] = (0, react.useState)(void 0);
			const [usage, setUsage] = (0, react.useState)({ status: "idle" });
			const [usageUpdatedAt, setUsageUpdatedAt] = (0, react.useState)(void 0);
			const usageEpoch = (0, react.useRef)(0);
			const mounted = (0, react.useRef)(true);
			const [catalogOpen, setCatalogOpen] = (0, react.useState)(false);
			const [modelSorting, setModelSorting] = (0, react.useState)(false);
			const [expandedModels, setExpandedModels] = (0, react.useState)(/* @__PURE__ */ new Set());
			const dirty = source !== void 0 && draft !== void 0 && (!sameDraft(source, draft) || apiKey.length > 0);
			(0, react.useEffect)(() => {
				if (snapshot.status !== "ready" || snapshot.value === void 0 || snapshot.revision === sourceRevision || dirty) return;
				const next = draftOf(snapshot.value);
				setSource(next);
				setDraft(next);
				setSourceRevision(snapshot.revision);
			}, [
				dirty,
				snapshot.revision,
				snapshot.status,
				snapshot.value,
				sourceRevision
			]);
			const credentialEpoch = (0, react.useRef)(0);
			const refreshCredential = async () => {
				const epoch = credentialEpoch.current + 1;
				credentialEpoch.current = epoch;
				const liveCredential = () => mounted.current && epoch === credentialEpoch.current;
				try {
					const next = await props.describeCredential();
					if (!liveCredential()) return;
					setCredential(next);
				} catch {
					if (!liveCredential()) return;
					setCredential(void 0);
				}
			};
			(0, react.useEffect)(() => {
				if (snapshot.status === "ready") refreshCredential();
			}, [snapshot.status, snapshot.value?.apiKeyEnv]);
			(0, react.useEffect)(() => {
				mounted.current = true;
				return () => {
					mounted.current = false;
				};
			}, []);
			(0, react.useEffect)(() => () => {
				props.closeModelPicker();
			}, [props.closeModelPicker]);
			const disabled = snapshot.status !== "ready" || !snapshot.writable || busy;
			const invalid = draft !== void 0 && (modelFailure(draft.models) || apiKey.length > 0 && apiKey.trim().length === 0);
			const patchDraft = (next) => {
				setDraft((current) => current === void 0 ? current : {
					...current,
					...next
				});
				setFailure(void 0);
				setNotice(void 0);
			};
			const patchModel = (index, patch) => {
				patchDraft({ models: draft?.models.map((model, at) => at === index ? patchedModel(model, patch) : model) ?? [] });
			};
			const removeModel = (index) => {
				if (draft !== void 0) patchDraft({ models: draft.models.filter((_model, at) => at !== index) });
			};
			const toggleModel = (id) => {
				setExpandedModels((current) => {
					const next = new Set(current);
					if (!next.delete(id)) next.add(id);
					return next;
				});
			};
			const loadUsage = async () => {
				if (draft === void 0 || snapshot.value?.usageEnabled === false || !credential?.configured && apiKey.trim().length === 0) return;
				const epoch = usageEpoch.current + 1;
				usageEpoch.current = epoch;
				const live = () => mounted.current && epoch === usageEpoch.current;
				setUsage({ status: "loading" });
				try {
					if (apiKey.trim().length > 0) await props.storeApiKey(apiKey.trim());
					const result = await props.fetchUsage();
					if (!live()) return;
					if (result.status === "unsupported") setUsage({ status: "unsupported" });
					else {
						setUsage({
							status: "ready",
							usage: result.usage
						});
						setUsageUpdatedAt(/* @__PURE__ */ new Date());
						rememberHeadlineQuota(COMMANDCODE_SETTINGS_NAMESPACE, "CommandCode", headlineQuotaOf(result.usage, t));
					}
				} catch (error) {
					if (live()) setUsage({
						status: "error",
						message: messageOf(error, t("quotaFailed"))
					});
				}
			};
			(0, react.useEffect)(() => {
				if (snapshot.status === "ready" && credential?.configured === true && usage.status === "idle") loadUsage();
			}, [
				snapshot.status,
				credential?.configured,
				usage.status
			]);
			const fetchModels = async () => {
				if (draft === void 0) return;
				const initiallyPicked = new Set(draft.models.map((model) => model.id.trim()).filter(Boolean));
				setFetching(true);
				setFailure(void 0);
				setNotice(void 0);
				props.beginModelPicker(initiallyPicked, (selected) => {
					setDraft((current) => current === void 0 ? current : {
						...current,
						models: mergeSelected(current.models, selected)
					});
					setCatalogOpen(true);
					setFailure(void 0);
					setNotice(void 0);
				});
				try {
					const result = await props.discoverModels({});
					if (result.models.length === 0) {
						const message = t("fetchEmpty");
						props.failModelPicker(message);
						setFailure(message);
					} else props.completeModelPicker(result.models);
				} catch (error) {
					const message = messageOf(error, t("requestFailed"));
					props.failModelPicker(message);
					setFailure(message);
				} finally {
					setFetching(false);
				}
			};
			const discard = () => {
				if (source !== void 0) setDraft(structuredClone(source));
				setApiKey("");
				setFailure(void 0);
				setNotice(void 0);
			};
			const save = async () => {
				if (draft === void 0 || snapshot.value === void 0 || invalid) return;
				usageEpoch.current++;
				setBusy(true);
				setFailure(void 0);
				setNotice(void 0);
				try {
					if (apiKey.trim().length > 0) await props.storeApiKey(apiKey.trim());
					const accepted = await props.saveConfiguration(settingsOf(draft, snapshot.value));
					const next = draftOf(accepted.settings);
					setSource(next);
					setDraft(next);
					setSourceRevision(accepted.revision);
					setApiKey("");
					setNotice(t("saved"));
					await refreshCredential();
					setUsage({ status: "idle" });
				} catch (error) {
					const message = messageOf(error, t("saveFailed"));
					setFailure(message);
					setUsage((current) => current.status === "loading" ? {
						status: "error",
						message
					} : current);
				} finally {
					setBusy(false);
				}
			};
			const title = t("title");
			const liveQuota = credential?.configured === true && usage.status === "ready" ? headlineQuotaOf(usage.usage, t) : void 0;
			const headerQuota = credential?.configured === false || usage.status === "error" || usage.status === "unsupported" ? void 0 : liveQuota ?? headerQuotaFromCache(peekCachedUsage("llm-commandcode"));
			if (snapshot.status !== "ready" || draft === void 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				style: cardStyle,
				"data-provider-card": "",
				"data-provider-role": "llm",
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: providerUiCss }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
					type: "button",
					"data-provider-card-header": "",
					"aria-expanded": open,
					"aria-label": (open ? t("collapse") : t("expand")) + ": " + title,
					onClick: () => {
						setOpen((current) => !current);
					},
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderCardHeader, {
						title,
						mark: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandMark, {}),
						summary: "",
						status: "",
						open,
						role: "llm",
						...headerQuota === void 0 ? {} : { quota: headerQuota }
					})
				})]
			});
			const headerCount = interpolate(t("modelCount"), { count: draft.models.length });
			const headerStatus = credential === void 0 ? "" : credential.configured ? t("configured") : t("notConfigured");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				style: cardStyle,
				"data-provider-card": "",
				"data-provider-role": "llm",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("style", { children: providerUiCss }),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						"data-provider-card-header": "",
						"aria-expanded": open,
						"aria-label": (open ? t("collapse") : t("expand")) + ": " + title,
						onClick: () => setOpen((current) => !current),
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ProviderCardHeader, {
							title,
							mark: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BrandMark, {}),
							summary: headerCount,
							status: headerStatus,
							open,
							unsaved: dirty,
							unsavedLabel: t("unsaved"),
							role: "llm",
							...headerQuota === void 0 ? credential?.configured === true && (usage.status === "error" || usage.status === "unsupported") ? { quota: { label: t("quota") } } : {} : { quota: headerQuota }
						})
					}),
					open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						style: bodyStyle,
						"data-provider-body": "",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: hintStyle,
								children: t("description")
							}),
							snapshot.status === "ready" && !snapshot.writable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: statusStyle,
								children: t("readOnly")
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								style: sectionStyle,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h3", {
										style: sectionTitleStyle,
										children: t("connection")
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: fieldStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: labelStyle,
												children: t("apiKey")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												style: inputStyle,
												type: "password",
												"aria-label": t("apiKey"),
												autoComplete: "off",
												value: apiKey,
												placeholder: credential?.configured ? t("replaceKey") : t("apiKeyPlaceholder"),
												disabled: disabled || credential?.writable === false,
												onChange: (event) => {
													setApiKey(event.target.value);
													setFailure(void 0);
													setNotice(void 0);
												}
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: hintStyle,
												children: apiKey.length > 0 ? t("pendingKey") : credential?.configured ? t("configured") : t("notConfigured")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										style: fieldStyle,
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: labelStyle,
												children: t("providerURL")
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
												style: inputStyle,
												type: "url",
												"aria-label": t("providerURL"),
												value: PUBLIC_PROVIDER_BASE_URL,
												disabled: true,
												readOnly: true
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												style: hintStyle,
												children: t("providerURLHint")
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Capability, {
										label: t("zdr"),
										checked: draft.zeroDataRetention,
										disabled,
										onChange: (value) => {
											patchDraft({ zeroDataRetention: value });
											setNotice(void 0);
										}
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: hintStyle,
										children: t("zdrHint")
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								style: sectionStyle,
								"aria-label": t("quota"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageHeader, {
										title: t("quota"),
										spinning: usage.status === "loading",
										disabled: usage.status === "loading" || disabled || credential?.configured !== true && apiKey.trim().length === 0,
										refreshLabel: t("quotaRefresh"),
										busyLabel: t("quotaLoading"),
										onRefresh: () => void loadUsage()
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageContent, {
										state: usage,
										t
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)(UsageUpdatedAt, {
										at: usage.status === "ready" ? usageUpdatedAt : void 0,
										label: usage.status === "ready" && usageUpdatedAt !== void 0 ? interpolate(t("quotaUpdated"), { time: usageUpdatedAt.toLocaleTimeString() }) : ""
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								style: sectionStyle,
								"aria-label": t("models"),
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
										style: {
											display: "flex",
											alignItems: "center",
											justifyContent: "space-between",
											gap: 10
										},
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											style: disclosureStyle,
											"aria-expanded": catalogOpen,
											"aria-label": t("models"),
											onClick: () => setCatalogOpen((current) => !current),
											children: [
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevron, { open: catalogOpen }),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: sectionTitleStyle,
													children: t("models")
												}),
												/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
													style: hintStyle,
													children: draft.models.length > 0 ? t("customCatalog") : t("defaultCatalog")
												})
											]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
											style: {
												display: "inline-flex",
												gap: 8
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: buttonStyle,
												"aria-pressed": modelSorting,
												disabled: disabled || draft.models.length < 2,
												onClick: () => {
													setModelSorting((current) => !current);
												},
												children: t(modelSorting ? "doneSorting" : "sortModels")
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
												type: "button",
												style: buttonStyle,
												disabled: disabled || fetching,
												onClick: () => void fetchModels(),
												children: fetching ? t("fetchingModels") : t("refreshModels")
											})]
										})]
									}),
									catalogOpen ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(SortableList, {
										items: draft.models,
										getId: (model) => model.rowId,
										disabled,
										sorting: modelSorting,
										dragLabel: (model, index) => t("dragModel") + ": " + (model.id.trim() || String(index + 1)),
										moveButtons: true,
										moveUpLabel: (model, index) => t("moveUp") + ": " + (model.id.trim() || String(index + 1)),
										moveDownLabel: (model, index) => t("moveDown") + ": " + (model.id.trim() || String(index + 1)),
										onReorder: (models) => patchDraft({ models }),
										renderItem: (item, index) => {
											const expanded = expandedModels.has(item.rowId);
											const modelLabel = item.id.trim() || String(index + 1);
											return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
												"data-model-row": modelLabel,
												"data-provider-model": "",
												style: modelContentStyle,
												children: [
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
														style: rowInputStyle,
														value: item.id,
														placeholder: t("modelId"),
														"aria-label": t("modelId") + " " + String(index + 1),
														disabled,
														onChange: (event) => patchModel(index, { id: event.target.value })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
														style: rowInputStyle,
														value: item.name ?? "",
														placeholder: t("modelName"),
														"aria-label": t("modelName") + " " + String(index + 1),
														disabled,
														onChange: (event) => patchModel(index, { name: event.target.value || void 0 })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														style: iconButtonStyle,
														"aria-label": t("modelDetails") + ": " + modelLabel,
														"aria-expanded": expanded,
														title: t("modelDetails"),
														onClick: () => toggleModel(item.rowId),
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconChevron, { open: expanded })
													}),
													/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
														type: "button",
														style: iconButtonStyle,
														"aria-label": t("remove") + " " + modelLabel,
														title: t("remove"),
														disabled,
														onClick: () => removeModel(index),
														children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(IconTrash, {})
													}),
													expanded ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelDetails, {
														model: item,
														disabled,
														t,
														patch: (patch) => patchModel(index, patch)
													}) : null
												]
											});
										}
									}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										style: {
											...buttonStyle,
											alignSelf: "flex-start"
										},
										disabled,
										onClick: () => {
											const item = {
												rowId: newModelRowId(),
												id: "",
												contextWindow: ""
											};
											patchDraft({ models: [...draft.models, item] });
											setExpandedModels((current) => new Set(current).add(item.rowId));
										},
										children: t("addModel")
									})] }) : null,
									draft.models.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
										style: hintStyle,
										children: t("fetchModelsFirst")
									}) : null
								]
							}),
							failure !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: errorStyle,
								children: failure
							}) : null,
							notice !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								style: statusStyle,
								children: notice
							}) : null,
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								style: actionsStyle,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: buttonStyle,
									disabled: !dirty || busy || disabled,
									onClick: discard,
									children: t("discard")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									style: primaryButtonStyle,
									disabled: !dirty || busy || disabled || invalid,
									onClick: () => void save(),
									children: busy ? t("saving") : t("save")
								})]
							})
						]
					}) : null
				]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Localized copy for the Command Code settings card. */
		const en = {
			title: "Command Code",
			description: "Command Code Provider API, live models, and account quota.",
			connection: "Connection",
			pendingKey: "New key entered",
			expand: "Expand",
			collapse: "Collapse",
			unsaved: "Unsaved",
			providerContext: "Provider value",
			fetchModelsFirst: "Fetch models to populate this catalog.",
			fetchEmpty: "The Provider API returned no models.",
			requestFailed: "Request failed",
			apiKey: "API key",
			apiKeyPlaceholder: "Enter Command Code API key",
			configured: "Configured",
			notConfigured: "Not configured",
			replaceKey: "Enter a new key to replace the saved key",
			providerURL: "Provider API URL",
			providerURLHint: "Fixed official Command Code Provider API endpoint.",
			models: "Model catalog",
			modelCount: "{count} models",
			defaultCatalog: "Default catalog",
			customCatalog: "Custom catalog",
			refreshModels: "Choose from official catalog",
			fetchingModels: "Fetching models…",
			addModel: "Add model",
			modelId: "Model ID",
			modelName: "Name",
			context: "Context",
			contextOverride: "Context override",
			contextWindow: "Context window",
			output: "Max output",
			reasoning: "Reasoning",
			vision: "Vision",
			effortOptions: "Effort options",
			defaultEffort: "Default effort",
			defaultThinking: "Default thinking",
			thinkingHint: "Controls the model’s internal reasoning depth.",
			effortUnavailable: "This model has no published effort options.",
			remove: "Remove",
			useProviderContext: "Provider value",
			fallbackContext: "Fallback",
			removeModel: "Remove model",
			modelDetails: "Model details",
			dragModel: "Reorder model",
			sortModels: "Sort",
			doneSorting: "Done",
			moveUp: "Move up",
			moveDown: "Move down",
			pickerTitle: "Select Command Code models",
			pickerDescription: "Groups reflect official CLI plan categories; actual account access is checked by Command Code.",
			pickerLoading: "Loading the live model catalog…",
			close: "Close",
			cancel: "Cancel",
			applySelected: "Add selected",
			groupGo: "Go · open models",
			groupPro: "Pro · premium models",
			groupProvider: "Provider+ · frontier models",
			groupOther: "Other · verify access",
			contextUnknown: "context unknown",
			quota: "Account quota",
			quotaLoading: "Reading quota…",
			quotaRefresh: "Refresh",
			quotaNoKey: "Enter and save an API key to read account quota.",
			quotaUnsupported: "Account quota is unavailable for this endpoint.",
			quotaFailed: "Quota read failed",
			quotaUpdated: "Updated {time}",
			monthly: "Monthly credits",
			purchased: "Purchased credits",
			free: "Free credits",
			fiveHour: "5-hour window",
			weekly: "Weekly window",
			used: "Used",
			reset: "Resets {time}",
			plan: "Plan",
			periodEnd: "Billing period ends {time}",
			summaryCost: "Period cost",
			summaryTokens: "Period tokens",
			account: "Account",
			zdr: "Zero data retention",
			zdrHint: "Adds x-cmd-zdr: 1. No model requires it; unavailable ZDR upstreams can return HTTP 422.",
			usageEnabled: "Show account quota",
			usageHint: "Uses account routes currently used by the official CLI; it never blocks chat.",
			save: "Save",
			saving: "Saving…",
			discard: "Discard",
			saved: "Saved",
			saveFailed: "Save failed",
			discoveryEmpty: "No models configured or returned; fetch models to populate.",
			discoveryWarning: "Some models have no valid context and were not made selectable: {models}",
			invalid: "Enter positive model capacities.",
			readOnly: "This settings profile is read-only."
		};
		const zh = {
			title: "Command Code",
			description: "配置 Command Code Provider API、实时模型和账户额度。",
			connection: "连接",
			pendingKey: "已输入新密钥",
			expand: "展开",
			collapse: "收起",
			unsaved: "未保存",
			providerContext: "Provider 值",
			fetchModelsFirst: "请先获取模型来填充目录。",
			fetchEmpty: "Provider API 没有返回模型。",
			requestFailed: "请求失败",
			apiKey: "API 密钥",
			apiKeyPlaceholder: "输入 Command Code API 密钥",
			configured: "已配置",
			notConfigured: "未配置",
			replaceKey: "输入新密钥以替换已保存的密钥",
			providerURL: "Provider API 地址",
			providerURLHint: "固定的 Command Code 官方 Provider API 地址。",
			models: "模型目录",
			modelCount: "{count} 个模型",
			defaultCatalog: "默认目录",
			customCatalog: "自定义目录",
			refreshModels: "从官方目录选择",
			fetchingModels: "获取中…",
			addModel: "添加模型",
			modelId: "模型 ID",
			modelName: "名称",
			context: "上下文",
			contextOverride: "上下文覆盖",
			contextWindow: "上下文窗口",
			output: "最大输出",
			reasoning: "推理",
			vision: "视觉",
			effortOptions: "Effort 选项",
			defaultEffort: "默认 Effort",
			defaultThinking: "默认思考强度",
			thinkingHint: "控制模型内部推理深度。",
			effortUnavailable: "此模型没有公开的 effort 选项。",
			remove: "删除",
			useProviderContext: "Provider 值",
			fallbackContext: "回退值",
			removeModel: "删除模型",
			modelDetails: "模型详情",
			dragModel: "调整模型顺序",
			sortModels: "排序",
			doneSorting: "完成排序",
			moveUp: "上移",
			moveDown: "下移",
			pickerTitle: "选择 Command Code 模型",
			pickerDescription: "按官方 CLI 套餐分组；实际账号权限仍由 Command Code 校验。",
			pickerLoading: "正在加载实时模型目录…",
			close: "关闭",
			cancel: "取消",
			applySelected: "加入所选",
			groupGo: "Go · 开源模型",
			groupPro: "Pro · 高级模型",
			groupProvider: "Provider+ · 前沿模型",
			groupOther: "其他 · 请验证权限",
			contextUnknown: "上下文未知",
			quota: "账户额度",
			quotaLoading: "正在读取额度…",
			quotaRefresh: "刷新",
			quotaNoKey: "输入并保存 API 密钥后才能读取账户额度。",
			quotaUnsupported: "此端点无法提供账户额度。",
			quotaFailed: "额度读取失败",
			quotaUpdated: "{time} 已更新",
			monthly: "月度额度",
			purchased: "购买额度",
			free: "免费额度",
			fiveHour: "5 小时窗口",
			weekly: "每周窗口",
			used: "已用",
			reset: "{time} 重置",
			plan: "套餐",
			periodEnd: "计费周期结束于 {time}",
			summaryCost: "周期成本",
			summaryTokens: "周期 tokens",
			account: "账户",
			zdr: "零数据留存",
			zdrHint: "会添加 x-cmd-zdr: 1；没有模型强制需要它，但无可用 ZDR upstream 时可能返回 HTTP 422。",
			usageEnabled: "显示账户额度",
			usageHint: "使用官方 CLI 当前使用的账户接口；不会阻塞聊天。",
			save: "保存",
			saving: "保存中…",
			discard: "放弃",
			saved: "已保存",
			saveFailed: "保存失败",
			discoveryEmpty: "尚未配置模型或 Provider API 没有返回模型，请先获取模型。",
			discoveryWarning: "部分模型没有有效上下文，未加入可选列表：{models}",
			invalid: "请输入正数模型容量。",
			readOnly: "此 settings profile 为只读。"
		};
		//#endregion
		//#region src/client/index.ts
		const name = "dsh-llm-commandcode-client";
		const inject = [
			"slots",
			"locale",
			"connection"
		];
		/**
		* Grace window before the missing-owner warning fires: the LLM Providers owner registers its
		* `settings.section` entry only once the settings snapshot is ready and the page is visible, so an
		* immediate check always runs too early and reports a false alarm.
		*/
		const MISSING_OWNER_GRACE_MS = 15e3;
		/** Register the Command Code card inside the shared LLM Providers section. */
		function apply(ctx) {
			const localeNamespace = "settings.commandcode";
			ctx.effect(() => ctx.locale.register(localeNamespace, {
				en,
				zh
			}), "llm-commandcode: locale");
			const t = ctx.locale.bind(localeNamespace);
			const picker = new CommandCodeModelPickerController();
			let snapshot = {
				status: "loading",
				value: void 0,
				base: void 0,
				user: void 0,
				revision: void 0,
				writable: false,
				mode: "memory"
			};
			const listeners = /* @__PURE__ */ new Set();
			const scope = {
				getSnapshot: () => snapshot,
				subscribe: (listener) => {
					listeners.add(listener);
					return () => {
						listeners.delete(listener);
					};
				},
				mutate: async () => void 0,
				set: async () => void 0,
				unset: async () => void 0
			};
			const updateSnapshot = (next) => {
				snapshot = next;
				listeners.forEach((listener) => {
					listener();
				});
			};
			const { rpc } = ctx.get("connection");
			const callPlugin = async (endpoint, payload) => rpc.call(COMMANDCODE_RPC_CHANNEL, endpoint, payload);
			const readManagement = async () => {
				const result = await callPlugin(COMMANDCODE_SETTINGS_READ_ENDPOINT, {});
				if (!result.ok) {
					updateSnapshot({
						...snapshot,
						status: "unavailable"
					});
					return;
				}
				const decoded = decodeCommandCodeSettingsReadResult(result.value);
				if (decoded === void 0) {
					updateSnapshot({
						...snapshot,
						status: "unavailable"
					});
					return;
				}
				updateSnapshot({
					status: "ready",
					value: decoded.settings,
					base: decoded.settings,
					user: decoded.settings,
					revision: decoded.revision,
					writable: decoded.credential.writable,
					mode: "host"
				});
			};
			readManagement();
			const describeCredential = async () => {
				const result = await callPlugin(COMMANDCODE_CREDENTIAL_STATUS_ENDPOINT, {});
				if (!result.ok) throw new Error(result.error.message);
				const value = result.value;
				if (typeof value.configured !== "boolean" || typeof value.writable !== "boolean") throw new Error(t("requestFailed"));
				return {
					configured: value.configured,
					writable: value.writable
				};
			};
			const storeApiKey = async (value) => {
				const result = await callPlugin(COMMANDCODE_CREDENTIAL_SET_ENDPOINT, { apiKey: value });
				if (!result.ok) throw new Error(result.error.message);
				dropPersistedUsageKeys([COMMANDCODE_SETTINGS_NAMESPACE]);
				ctx.get("providerDirectory")?.invalidateUsage(COMMANDCODE_SETTINGS_NAMESPACE);
			};
			const saveConfiguration = async (settings) => {
				const current = scope.getSnapshot();
				if (current.revision === void 0) throw new Error(t("saveFailed"));
				const { apiKeyEnv: _apiKeyEnv, ...withoutKey } = settings;
				const result = await callPlugin(COMMANDCODE_SAVE_ENDPOINT, {
					settings: withoutKey,
					expectedRevision: current.revision
				});
				if (!result.ok) throw new Error(result.error.message);
				const saved = decodeCommandCodeSaveResult(result.value);
				if (saved === void 0) throw new Error(t("saveFailed"));
				updateSnapshot({
					...snapshot,
					status: "ready",
					value: saved.settings,
					base: saved.settings,
					user: saved.settings,
					revision: saved.revision,
					writable: snapshot.writable,
					mode: "host"
				});
				return saved;
			};
			const discover = async (request) => {
				const result = await callPlugin(COMMANDCODE_DISCOVER_ENDPOINT, request);
				if (!result.ok) throw new Error(result.error.message);
				const decoded = decodeCommandCodeDiscoveryResult(result.value);
				if (decoded === void 0) throw new Error(t("discoveryEmpty"));
				return decoded;
			};
			const fetchUsage = async () => {
				const result = await callPlugin(COMMANDCODE_USAGE_ENDPOINT, {});
				if (!result.ok) throw new Error(result.error.message);
				const decoded = decodeCommandCodeUsageReply(result.value);
				if (decoded === void 0) throw new Error(t("quotaFailed"));
				if (decoded.status === "unsupported") return { status: "unsupported" };
				return {
					status: "ok",
					usage: decoded.usage
				};
			};
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "commandcode-model-picker",
				order: 100,
				inject: () => ({
					t,
					hooks: { commandCodeModelPicker: picker },
					closePicker: picker.close,
					togglePickerModel: picker.toggle,
					adoptPickerModels: picker.adopt
				})
			}, CommandCodeModelPicker));
			ctx.slots.inject("settings.provider.item", () => ctx.slots.register({
				name: "settings.provider.item",
				key: COMMANDCODE_SETTINGS_NAMESPACE,
				locale: localeNamespace,
				inject: () => ({
					t,
					hooks: { commandCodeSettings: scope },
					describeCredential,
					storeApiKey,
					saveConfiguration,
					discoverModels: discover,
					fetchUsage,
					beginModelPicker: (initiallyPicked, onAdopt) => {
						picker.begin(onAdopt, initiallyPicked);
					},
					completeModelPicker: (candidates) => {
						picker.complete(candidates);
					},
					failModelPicker: (message) => {
						picker.fail(message);
					},
					closeModelPicker: picker.close
				})
			}, CommandCodeSettingsCard));
			ctx.inject(["providerDirectory"], (ctx) => {
				ctx.effect(() => ctx.providerDirectory.register({
					key: COMMANDCODE_SETTINGS_NAMESPACE,
					role: "llm",
					header: "shared",
					usage: createCommandCodeUsageReader()
				}), "dsh-llm-commandcode: provider directory");
			});
			ctx.effect(() => {
				let warned = false;
				const hasProvidersSection = () => ctx.slots.entries("settings.section").some((entry) => entry.options.id === "providers");
				const check = () => {
					if (hasProvidersSection() || warned) return;
					warned = true;
					console.warn(`[dsh-llm-providers-ui] LLM Providers page missing for card llm-commandcode: install dsh-llm-providers-ui to show the card. Host route remains active.`);
				};
				const timer = setTimeout(check, MISSING_OWNER_GRACE_MS);
				const stop = ctx.slots.subscribe("settings.section", () => {
					if (!hasProvidersSection()) return;
					clearTimeout(timer);
					warned = true;
				});
				return () => {
					clearTimeout(timer);
					stop();
				};
			}, "dsh-llm-providers-ui: missing owner diagnostic");
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
