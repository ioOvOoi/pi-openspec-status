/**
 * Mode state management for the OpenSpec extension.
 *
 * Manages build/opsx mode toggle with lightweight persistence
 * to ~/.pi/agent/openspec-mode.json.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";

// ── Types ─────────────────────────────────────────────────────────────

export type OpenSpecMode = "build" | "opsx";

export interface ModeConfig {
	defaultMode: OpenSpecMode;
	projects: Record<string, OpenSpecMode>;
}

export interface ModeState {
	mode: OpenSpecMode;
}

// ── Config Path ───────────────────────────────────────────────────────

const CONFIG_FILE = join(homedir(), ".pi", "agent", "openspec-mode.json");

// ── Config IO ─────────────────────────────────────────────────────────

function ensureConfigDir(): void {
	const dir = dirname(CONFIG_FILE);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

export function loadModeConfig(): ModeConfig {
	try {
		if (!existsSync(CONFIG_FILE)) {
			return { defaultMode: "build", projects: {} };
		}
		const raw = readFileSync(CONFIG_FILE, "utf-8");
		const parsed = JSON.parse(raw) as Partial<ModeConfig>;
		return {
			defaultMode: parsed.defaultMode ?? "build",
			projects: parsed.projects ?? {},
		};
	} catch {
		return { defaultMode: "build", projects: {} };
	}
}

export function saveModeConfig(config: ModeConfig): void {
	try {
		ensureConfigDir();
		writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
	} catch {
		// Silently fail — mode state is advisory
	}
}

// ── Mode Access ───────────────────────────────────────────────────────

let currentMode: OpenSpecMode = "build";

export function getMode(): OpenSpecMode {
	return currentMode;
}

export function setMode(mode: OpenSpecMode, projectPath: string): void {
	currentMode = mode;
	const config = loadModeConfig();
	config.projects[projectPath] = mode;
	saveModeConfig(config);
}

export function restoreMode(projectPath: string): void {
	const config = loadModeConfig();
	currentMode = config.projects[projectPath] ?? config.defaultMode;
}

// ── Command Registration ──────────────────────────────────────────────

export function registerModeCommands(
	pi: ExtensionAPI,
	projectPath: string,
	onModeChange: (mode: OpenSpecMode) => void,
): void {
	pi.registerCommand("opsx", {
		description:
			"Switch to OPSX mode (strict OpenSpec workflow 严格 OpenSpec 模式)",
		handler: async (_args, ctx) => {
			setMode("opsx", projectPath);
			if (ctx.hasUI) {
				ctx.ui.notify("Mode switched: OPSX 模式已切换: OPSX", "info");
			}
			onModeChange("opsx");
		},
	});

	pi.registerCommand("build", {
		description: "Switch to BUILD mode (free development 自由开发模式)",
		handler: async (_args, ctx) => {
			setMode("build", projectPath);
			if (ctx.hasUI) {
				ctx.ui.notify("Mode switched: BUILD 模式已切换: BUILD", "info");
			}
			onModeChange("build");
		},
	});
}
