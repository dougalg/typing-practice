export default {
	extends: ["@commitlint/config-conventional"],
	prompt: {
		messages: {
			type: "Select the type of change you're committing:",
			scope: "Denote the scope of this change (optional):",
			customScope: "Denote the scope of this change:",
			subject: "Write a short, imperative description of the change:\n",
			body: 'Provide a longer description of the change (optional). Use "|" to break new line:\n',
			breaking: 'List any breaking changes (optional). Use "|" to break new line:\n',
			footerPrefixesSelect: "Select the issues type from the list (optional):",
			customFooterPrefix: "Input a custom issue prefix:",
			footer: "List any issues affected by this change (optional). E.g.: #31, #34:\n",
			confirmCommit: "Are you sure you want to proceed with the commit above?",
		},
		types: [
			{ value: "feat", name: "feat:     A new feature" },
			{ value: "fix", name: "fix:      A bug fix" },
			{ value: "docs", name: "docs:     Documentation only changes" },
			{
				value: "style",
				name: "style:    Changes that do not affect the meaning of the code (formatting, etc)",
			},
			{
				value: "refactor",
				name: "refactor: A code change that neither fixes a bug nor adds a feature",
			},
			{ value: "perf", name: "perf:     A code change that improves performance" },
			{ value: "test", name: "test:     Adding missing tests or correcting existing tests" },
			{
				value: "build",
				name: "build:    Changes that affect the build system or dependencies",
			},
			{ value: "ci", name: "ci:       Changes to CI configuration files and scripts" },
			{
				value: "chore",
				name: "chore:    Other changes that don't modify src or test files",
			},
			{ value: "revert", name: "revert:   Reverts a previous commit" },
		],
		scopes: ["views", "components", "features", "layouts", "setup", "practice", "deps"],
		allowCustomScopes: true,
		allowEmptyScopes: true,
		customScopesAlign: "bottom",
		allowBreakingChanges: ["feat", "fix"],
	},
};
