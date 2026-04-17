/// <reference types="vite/client" />

interface AgentCommandResult {
	ok: boolean;
	success?: boolean;
	message?: string;
	data?: unknown;
	error?: string;
}

declare global {
	interface Window {
		humanfirstDesktop?: {
			isDesktop: boolean;
			version: string;
			platform: string;

			getExamMode: () => Promise<boolean>;
			setExamMode: (enabled: boolean) => Promise<boolean>;
			unlockExamMode: (pin: string) => Promise<{ ok: boolean; enabled: boolean; bypass: boolean }>;
			getAssignmentMode: () => Promise<boolean>;
			setAssignmentMode: (enabled: boolean) => Promise<boolean>;
			getLogsInfo: () => Promise<{ ok: boolean; userData: string; logsDir: string; logFilePath: string }>;
			openLogsFolder: () => Promise<{ ok: boolean; logsDir: string; error: string }>;

			agentStatus: () => Promise<AgentCommandResult>;
			agentPushPolicies: (policies: Array<{
				id: string;
				title: string;
				isActive: boolean;
				examMode: boolean;
				startTime: string;
				endTime: string;
				allowedApps?: string[];
				blockedApps?: string[];
				allowedDomains?: string[];
			}>) => Promise<AgentCommandResult>;
			agentReload: () => Promise<AgentCommandResult>;
			getAgentPolicyEnabled?: () => Promise<boolean>;
			setAgentPolicyEnabled?: (enabled: boolean) => Promise<boolean>;

			browserViewCreate?: (url: string) => Promise<{
				ok: boolean;
				state?: {
					url: string;
					title?: string;
					canGoBack: boolean;
					canGoForward: boolean;
					isLoading: boolean;
				};
				error?: string;
			}>;
			browserViewDestroy?: () => Promise<{ ok: boolean; error?: string }>;
			browserViewSetBounds?: (bounds: {
				x: number;
				y: number;
				width: number;
				height: number;
				viewportWidth: number;
				viewportHeight: number;
			}) => Promise<{ ok: boolean; error?: string }>;
			browserViewSetHidden?: (hidden: boolean) => Promise<{ ok: boolean; error?: string }>;
			browserViewNavigate?: (url: string) => Promise<{ ok: boolean; error?: string }>;
			browserViewBack?: () => Promise<{ ok: boolean; error?: string }>;
			browserViewForward?: () => Promise<{ ok: boolean; error?: string }>;
			browserViewReload?: () => Promise<{ ok: boolean; error?: string }>;
			fileDialog?: {
				openFile?: (options: {
					title: string;
					properties: string[];
					filters: Array<{ name: string; extensions: string[] }>;
					defaultPath?: string;
				}) => Promise<{
					cancelled?: boolean;
					filePaths?: string[];
				}>;
				openFolder?: (options: {
					title: string;
					defaultPath?: string;
				}) => Promise<{
					cancelled?: boolean;
					filePaths?: string[];
				}>;
			};
			getSessionFolder?: () => Promise<{ locked: boolean; path: string }>;
			setSessionFolder?: (path: string) => Promise<{
				ok: boolean;
				locked: boolean;
				path: string;
				error?: string;
			}>;
			saveAssignmentDraft?: (payload: {
				html: string;
				savedAt: string;
			}) => Promise<{
				ok: boolean;
				filePath?: string;
				savedAt?: string;
				error?: string;
			}>;
			exportAssignmentDocument?: (payload: {
				htmlContent: string;
				studentName: string;
				assignmentName: string;
				format: 'pdf' | 'docx';
				sessionId: string;
				studentId: string;
				policyId: string;
				orgId: string;
				accessToken: string;
				supabaseUrl: string;
				supabaseAnonKey: string;
			}) => Promise<{
				ok: boolean;
				filePath?: string;
				fileName?: string;
				fileSizeKb?: number;
				format?: string;
				metadata?: any;
				error?: string;
			}>;
			exportAssignmentPdf?: (payload: {
				htmlContent: string;
				studentName: string;
				assignmentName: string;
				sessionId: string;
				studentId: string;
				policyId: string;
				orgId: string;
				accessToken: string;
				supabaseUrl: string;
				supabaseAnonKey: string;
			}) => Promise<{
				ok: boolean;
				filePath?: string;
				fileName?: string;
				fileSizeKb?: number;
				format?: string;
				metadata?: any;
				error?: string;
			}>;
			quitAfterDelay?: (delayMs: number) => Promise<{
				ok: boolean;
				delayMs?: number;
				error?: string;
			}>;
			setSubmissionLock?: (submissionUrl: string) => Promise<{
				ok: boolean;
				domain?: string;
				error?: string;
			}>;
			clearSubmissionLock?: () => Promise<{ ok: boolean }>;
			onBrowserViewState?: (callback: (payload: {
				url: string;
				title?: string;
				canGoBack: boolean;
				canGoForward: boolean;
				isLoading: boolean;
			}) => void) => () => void;
			onBrowserViewBlocked?: (callback: (payload: {
				url: string;
				domain: string;
				reason: string;
			}) => void) => () => void;
			onBrowserViewNewTab?: (callback: (payload: {
				url: string;
			}) => void) => () => void;

			onExamModeChanged: (callback: (payload: { enabled: boolean; source?: string }) => void) => () => void;
			onCloseBlocked: (callback: (payload: { enabled: boolean }) => void) => () => void;
			onRiskAlert?: (callback: (event: {
				type: string;
				length?: number;
				domain?: string;
				assignment_id?: string;
				session_id?: string;
				process_name?: string;
				severity_level?: 'LOW' | 'MEDIUM' | 'HIGH';
				timestamp: number;
			}) => void) => () => void;
		};
	}
}

export { };
