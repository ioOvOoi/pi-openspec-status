/**
 * Hook implementations for the OpenSpec mode system.
 *
 * Three layers:
 *   1. before_agent_start — inject pipeline context into system prompt
 *   2. tool_call (write/edit) — soft confirm dialog for non-openspec writes
 *   3. tool_call (bash) — hard block dangerous commands
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { isToolCallEventType } from "@earendil-works/pi-coding-agent";
import type { ArtifactStatus, ChangeDetail } from "./types.ts";
import type { OpenSpecMode } from "./mode.ts";
import {
	getCurrentStage,
	buildPipelinePrompt,
	inferStageIndex,
} from "./pipeline.ts";

// ═══════════════════════════════════════════════════════════════════════
// Dangerous command patterns (always blocked)
// ═══════════════════════════════════════════════════════════════════════

const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
	{
		pattern: /\bgit\s+push\b.*(--force|-f)\b/i,
		reason: "git push --force is blocked",
	},
	{
		pattern: /\bgit\s+push\b.*(--delete|-d)\b/i,
		reason: "git push --delete is blocked",
	},
	{ pattern: /\brm\s+-rf\s+\/(\*)?\b/i, reason: "rm -rf / is blocked" },
];

function checkDangerousCommand(command: string): string | null {
	for (const entry of DANGEROUS_PATTERNS) {
		if (entry.pattern.test(command)) {
			return entry.reason;
		}
	}
	return null;
}

// ═══════════════════════════════════════════════════════════════════════
// File path helpers for write/edit soft interception
// ═══════════════════════════════════════════════════════════════════════

function isInOpenSpecDir(filePath: string): boolean {
	const normalized = filePath.replace(/\\/g, "/");
	return (
		normalized.includes("/openspec/changes/") ||
		normalized.startsWith("openspec/changes/")
	);
}

/** Any artifact's status is "ready" or "blocked" → still in planning, not applying */
function isApplying(artifacts: ArtifactStatus[]): boolean {
	return artifacts.every((a) => a.status === "done");
}

// ═══════════════════════════════════════════════════════════════════════
// State providers (set by index.ts)
// ═══════════════════════════════════════════════════════════════════════

let _getMode: () => OpenSpecMode = () => "build";
let _getActiveChange: () => {
	name: string;
	artifacts: ArtifactStatus[];
} | null = () => null;

export function setHookStateProviders(
	getMode: () => OpenSpecMode,
	getActiveChange: () => { name: string; artifacts: ArtifactStatus[] } | null,
): void {
	_getMode = getMode;
	_getActiveChange = getActiveChange;
}

// ═══════════════════════════════════════════════════════════════════════
// Main registration
// ═══════════════════════════════════════════════════════════════════════

export function registerHooks(pi: ExtensionAPI): void {
	// ── Hook 1: before_agent_start — inject pipeline context ──────────
	pi.on("before_agent_start", async (event) => {
		const mode = _getMode();
		if (mode !== "opsx") return;

		const change = _getActiveChange();
		const stageIndex = change ? inferStageIndex(change.artifacts) : 0;
		const prompt = buildPipelinePrompt(change?.name ?? null, stageIndex);

		return { systemPrompt: (event.systemPrompt ?? "") + prompt };
	});

	// ── Hook 2: tool_call — bash dangerous command blocking ───────────
	pi.on("tool_call", async (event) => {
		if (isToolCallEventType("bash", event)) {
			const command = event.input.command;
			const danger = checkDangerousCommand(command);
			if (danger) {
				return {
					block: true,
					reason: `Dangerous command blocked 危险命令已阻止: ${danger}`,
				};
			}
		}
	});

	// ── Hook 3: tool_call — write/edit soft interception ──────────────
	pi.on("tool_call", async (event, ctx) => {
		const mode = _getMode();
		if (mode !== "opsx") return;

		if (
			isToolCallEventType("write", event) ||
			isToolCallEventType("edit", event)
		) {
			const path = event.input.path as string;
			if (!path) return;

			// Always allow writes inside openspec/changes/
			if (isInOpenSpecDir(path)) return;

			// Allow if any active change is in apply phase
			const change = _getActiveChange();
			if (change && isApplying(change.artifacts)) return;

			// Soft block: ask user
			if (ctx.hasUI) {
				const stage = change ? getCurrentStage(change.artifacts) : "unknown";
				const ok = await ctx.ui.confirm(
					"OpenSpec OPSX 模式",
					`Writing outside openspec/ directory: ${path}\n` +
						`Current stage 当前阶段: ${stage}\n` +
						`Changes should go through OpenSpec workflow. Continue?\n` +
						`变更应通过 OpenSpec 工作流进行。确认写入？`,
				);
				if (!ok) {
					return { block: true, reason: "User declined write in OPSX mode" };
				}
			}
		}
	});
}
