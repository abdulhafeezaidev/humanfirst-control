/**
 * Controlled Web Browser for Assignment Mode (Electron WebView)
 *
 * Architecture:
 * Navigation Event → Domain Detection → AI Check → Warning/Log/Alert
 *
 * Features:
 * - Full webview browser (loads real websites)
 * - Address bar with URL normalization
 * - Back/forward/refresh navigation controls
 * - Domain extraction and tracking on every navigation
 * - Seamless integration with DomainTracker service
 * - Sandbox security for safe page rendering
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Globe,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ControlledWebBrowserProps {
  initialUrl?: string;
  onNavigate: (url: string) => Promise<void>;
  assignmentId?: string;
  submissionMode?: boolean; // Enable submission mode (locks to submission domain only)
  submissionUrl?: string; // URL to lock to during submission
  onSubmissionDetected?: () => void; // Callback when submission confirmation detected
}

interface BlockedAttempt {
  url: string;
  domain: string;
  reason: string;
}

interface BrowserTab {
  id: string;
  url: string;
  title: string;
}

const BLOCKED_DOMAIN_PATTERNS = [
  'openai.com',
  'chat.openai.com',
  'chatgpt.com',
  'deepresearch.openai.com',
  'claude.ai',
  'anthropic.com',
  'gemini.google.com',
  'bard.google.com',
  'copilot.microsoft.com',
  'bing.com',
  'perplexity.ai',
  'poe.com',
  'pi.ai',
  'meta.ai',
  'grok.com',
  'x.ai',
  'deepseek.com',
  'chat.deepseek.com',
  'you.com',
  'phind.com',
  'blackbox.ai',
  'character.ai',
  'midjourney.com',
  'runwayml.com',
  'leonardo.ai',
  'huggingface.co',
  'cohere.com',
  'jasper.ai',
  'writesonic.com',
  'copy.ai',
  'notion.ai',
  'grammarly.com',
  'quillbot.com',
];

const BLOCKED_URL_FRAGMENT_PATTERNS = [
  '/copilot',
  '/chat',
  '/grok',
  '/gemini',
  '/bard',
  '/deepsearch',
  '/deep-search',
  '/ai-mode',
  'udm=50',
  'ia=chat',
  'model=gpt',
  'model=claude',
  'model=gemini',
  'model=deepseek',
];

const BLOCKED_QUERY_TERMS = [
  'chatgpt',
  'gpt-4',
  'gpt4',
  'claude',
  'gemini',
  'bard',
  'copilot',
  'perplexity',
  'deepseek',
  'grok',
  'poe ai',
  'ai mode',
  'deep research',
  'deep dive ai',
];

const ALLOWED_RESEARCH_DOMAINS = [
  'w3schools.com',
  'geeksforgeeks.org',
];

const AI_SIGNAL_HOST_PATTERNS = [
  ...BLOCKED_DOMAIN_PATTERNS,
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'search.yahoo.com',
  'brave.com',
];

export function ControlledWebBrowser({
  initialUrl = 'https://www.google.com',
  onNavigate,
  assignmentId,
  submissionMode = false,
  submissionUrl,
  onSubmissionDetected,
}: ControlledWebBrowserProps) {
  const desktopApi = typeof window !== 'undefined' ? window.humanfirstDesktop : undefined;
  const useBrowserView = !!(desktopApi?.isDesktop && desktopApi?.browserViewCreate);

  const [currentUrl, setCurrentUrl] = useState(submissionMode && submissionUrl ? submissionUrl : initialUrl);
  const [displayUrl, setDisplayUrl] = useState(submissionMode && submissionUrl ? submissionUrl : initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [blockedAttempt, setBlockedAttempt] = useState<BlockedAttempt | null>(null);
  const [tabs, setTabs] = useState<BrowserTab[]>([
    { id: 'tab-1', url: submissionMode && submissionUrl ? submissionUrl : initialUrl, title: 'Submission' },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab-1');
  const iframeRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const addressBarRef = useRef<HTMLInputElement>(null);
  const lastTrackedUrlRef = useRef<string>('');

  /**
   * Check if URL indicates submission completion
   */
  const checkForSubmissionConfirmation = useCallback(
    (url: string, pageTitle?: string) => {
      if (!submissionMode) return;

      const normalizedSubmissionUrl = (submissionUrl || "").toLowerCase().replace(/\/+$/, "");
      const lowerUrl = url.toLowerCase().replace(/\/+$/, "");
      const urlPatterns = ['confirm', 'success', 'thank', 'complete', 'received', 'submitted'];
      const titlePatterns = ['submitted', 'received', 'success', 'complete', 'thank'];

      // Ignore the initial LMS landing page to prevent immediate false positives.
      if (normalizedSubmissionUrl && lowerUrl === normalizedSubmissionUrl) {
        return;
      }

      // Check URL for confirmation patterns
      if (urlPatterns.some(pattern => lowerUrl.includes(pattern))) {
        onSubmissionDetected?.();
        return;
      }

      const lowerTitle = String(pageTitle || '').toLowerCase();
      if (lowerTitle && titlePatterns.some(pattern => lowerTitle.includes(pattern))) {
        onSubmissionDetected?.();
      }
    },
    [onSubmissionDetected, submissionMode, submissionUrl],
  );

  const normalizeUrl = useCallback((url: string): string => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // Check if it looks like a domain
      if (url.includes('.')) {
        return `https://${url}`;
      }
      // Treat as search query
      return `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    return url;
  }, []);

  const getDomainFromUrl = useCallback((url: string): string => {
    try {
      return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return '';
    }
  }, []);

  const getTabTitleFromUrl = useCallback((url: string): string => {
    const domain = getDomainFromUrl(url);
    if (!domain) return 'New Tab';
    const first = domain.split('.')[0] || domain;
    return first.charAt(0).toUpperCase() + first.slice(1);
  }, [getDomainFromUrl]);

  const getBlockedMatch = useCallback((url: string): { blocked: boolean; domain: string } => {
    const domain = getDomainFromUrl(url);
    if (!domain) return { blocked: false, domain: '' };

    const isAllowedResearchDomain = ALLOWED_RESEARCH_DOMAINS.some((allowed) =>
      domain === allowed || domain.endsWith(`.${allowed}`),
    );
    if (isAllowedResearchDomain) return { blocked: false, domain };

    const blockedDomain = BLOCKED_DOMAIN_PATTERNS.some((pattern) =>
      domain === pattern || domain.endsWith(`.${pattern}`),
    );
    if (blockedDomain) return { blocked: true, domain };

    const shouldCheckAiSignals = AI_SIGNAL_HOST_PATTERNS.some((host) =>
      domain === host || domain.endsWith(`.${host}`),
    );
    if (!shouldCheckAiSignals) return { blocked: false, domain };

    const normalizedUrl = String(url || '').toLowerCase();
    const blockedByFragment = BLOCKED_URL_FRAGMENT_PATTERNS.some((fragment) => normalizedUrl.includes(fragment));
    if (blockedByFragment) return { blocked: true, domain };

    try {
      const parsed = new URL(url);
      const queryText = decodeURIComponent(parsed.search || '').toLowerCase();
      const blockedByQuery = BLOCKED_QUERY_TERMS.some((term) => queryText.includes(term));
      if (blockedByQuery) return { blocked: true, domain };
    } catch {
      // ignore URL parsing failures and rely on domain/fragment checks
    }

    return { blocked: false, domain };
  }, [getDomainFromUrl]);

  const trackNavigatedUrl = useCallback(
    async (url: string) => {
      if (!url || url === 'about:blank') return;
      if (lastTrackedUrlRef.current === url) return;
      lastTrackedUrlRef.current = url;
      await onNavigate(url);
    },
    [onNavigate],
  );

  /**
   * Navigate to a URL
   */
  const handleNavigate = useCallback(
    async (url: string) => {
      const normalizedUrl = normalizeUrl(url);

      // In submission mode: block all navigation except to submission domain
      if (submissionMode && submissionUrl) {
        const submissionDomain = new URL(submissionUrl).hostname.toLowerCase().replace(/^www\./, '');
        const targetDomain = new URL(normalizedUrl).hostname.toLowerCase().replace(/^www\./, '');

        if (!targetDomain.includes(submissionDomain) && targetDomain !== submissionDomain) {
          setBlockedAttempt({
            url: normalizedUrl,
            domain: targetDomain,
            reason: 'submission_mode_locked',
          });
          setIsLoading(false);
          return;
        }

        // Check for submission confirmation patterns
        checkForSubmissionConfirmation(normalizedUrl);
      }

      const blocked = getBlockedMatch(normalizedUrl);
      if (blocked.blocked && !submissionMode) {
        setBlockedAttempt({
          url: normalizedUrl,
          domain: blocked.domain,
          reason: 'blocked_domain',
        });
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setDisplayUrl(normalizedUrl);

      try {
        await trackNavigatedUrl(normalizedUrl);

        if (useBrowserView && desktopApi?.browserViewNavigate) {
          const res = await desktopApi.browserViewNavigate(normalizedUrl);
          if (!res?.ok) {
            setIsLoading(false);
            if ((res as any)?.blocked) {
              setBlockedAttempt({
                url: normalizedUrl,
                domain: blocked.domain,
                reason: 'blocked_domain',
              });
            }
            return;
          }
          setCurrentUrl(normalizedUrl);
        } else {
          setCurrentUrl(normalizedUrl);
        }
      } catch (error) {
        console.error('Navigation failed:', error);
        setIsLoading(false);
      } finally {
        if (!useBrowserView) {
          setIsLoading(false);
        }
      }
    },
    [normalizeUrl, getBlockedMatch, trackNavigatedUrl, useBrowserView, desktopApi, submissionMode, submissionUrl, checkForSubmissionConfirmation],
  );

  /**
   * Handle back button
   */
  const handleBack = useCallback(() => {
    if (useBrowserView && desktopApi?.browserViewBack) {
      desktopApi.browserViewBack().catch((error) => {
        console.error('BrowserView back failed:', error);
      });
      return;
    }

    const webview = (iframeRef.current as any)?.webviewElement;
    if (webview && webview.canGoBack()) {
      webview.goBack();
      setCanGoForward(true);
    }
  }, [useBrowserView, desktopApi]);

  /**
   * Handle forward button
   */
  const handleForward = useCallback(() => {
    if (useBrowserView && desktopApi?.browserViewForward) {
      desktopApi.browserViewForward().catch((error) => {
        console.error('BrowserView forward failed:', error);
      });
      return;
    }

    const webview = (iframeRef.current as any)?.webviewElement;
    if (webview && webview.canGoForward()) {
      webview.goForward();
      setCanGoBack(true);
    }
  }, [useBrowserView, desktopApi]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    setIsLoading(true);

    if (useBrowserView && desktopApi?.browserViewReload) {
      desktopApi.browserViewReload().catch((error) => {
        console.error('BrowserView reload failed:', error);
        setIsLoading(false);
      });
      return;
    }

    const webview = (iframeRef.current as any)?.webviewElement;
    if (webview && typeof webview.reload === 'function') {
      webview.reload();
    }
  }, [useBrowserView, desktopApi]);

  /**
   * Handle address bar submission
   */
  const handleAddressBarSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const url = addressBarRef.current?.value || '';
      if (url) {
        handleNavigate(url);
      }
    },
    [handleNavigate],
  );

  const handleOpenNewTab = useCallback((nextUrl?: string) => {
    const seedUrl = nextUrl || 'https://www.google.com';
    const normalized = normalizeUrl(seedUrl);
    const id = `tab-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const title = getTabTitleFromUrl(normalized);

    setTabs((prev) => [...prev, { id, url: normalized, title }]);
    setActiveTabId(id);
    setDisplayUrl(normalized);
    handleNavigate(normalized);
  }, [normalizeUrl, getTabTitleFromUrl, handleNavigate]);

  const handleSelectTab = useCallback((tab: BrowserTab) => {
    setActiveTabId(tab.id);
    setDisplayUrl(tab.url);
    handleNavigate(tab.url);
  }, [handleNavigate]);

  const handleCloseTab = useCallback((tabId: string) => {
    if (tabs.length <= 1) return;

    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return;

    const remaining = tabs.filter((tab) => tab.id !== tabId);
    setTabs(remaining);

    if (tabId !== activeTabId) return;

    const fallback = remaining[Math.max(0, index - 1)] || remaining[0];
    if (!fallback) return;

    setActiveTabId(fallback.id);
    setDisplayUrl(fallback.url);
    handleNavigate(fallback.url);
  }, [tabs, activeTabId, handleNavigate]);

  useEffect(() => {
    setTabs((prev) => prev.map((tab) => (
      tab.id === activeTabId
        ? { ...tab, url: currentUrl, title: getTabTitleFromUrl(currentUrl) }
        : tab
    )));
  }, [currentUrl, activeTabId, getTabTitleFromUrl]);

  useEffect(() => {
    if (!desktopApi?.onBrowserViewNewTab) return;

    const unsub = desktopApi.onBrowserViewNewTab((payload) => {
      const nextUrl = String(payload?.url || 'https://www.google.com');
      handleOpenNewTab(nextUrl);
    });

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [desktopApi, handleOpenNewTab]);

  useEffect(() => {
    if (useBrowserView) return;

    const webviewContainer = iframeRef.current;
    if (!webviewContainer) return;

    // Check if already has webview child
    if (webviewContainer.querySelector('webview')) return;

    // Only create webview if in Electron
    if (!((window as any).humanfirstDesktop?.isDesktop)) return;

    // Create webview element (native element, not React JSX)
    const webview = document.createElement('webview') as any;
    webview.src = currentUrl;
    webview.setAttribute('allowpopups', '');
    webview.style.width = '100%';
    webview.style.height = '100%';
    webview.style.border = 'none';
    webview.style.display = 'block';
    webview.style.position = 'absolute';
    webview.style.top = '0';
    webview.style.left = '0';
    webview.style.right = '0';
    webview.style.bottom = '0';

    // Clear container and add webview
    webviewContainer.innerHTML = '';
    webviewContainer.appendChild(webview);

    (iframeRef.current as any).webviewElement = webview;

    const updateNavState = () => {
      try {
        setCanGoBack(!!webview.canGoBack?.());
        setCanGoForward(!!webview.canGoForward?.());
      } catch {
        // ignore
      }
    };

    const handleNavigation = (event: any) => {
      if (event.url && event.url !== 'about:blank') {
        const blocked = getBlockedMatch(event.url);
        if (blocked.blocked) {
          try {
            event.preventDefault?.();
          } catch {
            // ignore
          }
          setIsLoading(false);
          setBlockedAttempt({
            url: event.url,
            domain: blocked.domain,
            reason: 'blocked_domain',
          });
          return;
        }

        setCurrentUrl(event.url);
        setDisplayUrl(event.url);
        trackNavigatedUrl(event.url).catch(err => console.error('Failed to track domain:', err));
      }
      updateNavState();
    };

    const handleDidStartNavigation = () => setIsLoading(true);
    const handleDomReady = () => {
      try {
        webview.setZoomFactor(1);
      } catch {
        // ignore
      }
      // Re-assert full-size bounds after renderer initializes.
      webview.style.width = '100%';
      webview.style.height = '100%';
      webview.style.top = '0';
      webview.style.left = '0';
      webview.style.right = '0';
      webview.style.bottom = '0';
      updateNavState();
    };
    const handleDidNavigateInPage = (event: any) => {
      if (event.url) {
        setCurrentUrl(event.url);
        setDisplayUrl(event.url);
        if (submissionMode) {
          checkForSubmissionConfirmation(event.url);
        }
      }
      updateNavState();
    };

    const handleDidStopLoading = () => {
      setIsLoading(false);
      updateNavState();
    };

    const handleDidFailLoad = () => setIsLoading(false);

    webview.addEventListener('will-navigate', handleNavigation);
    webview.addEventListener('did-navigate-in-page', handleDidNavigateInPage);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-start-navigation', handleDidStartNavigation);
    webview.addEventListener('did-stop-loading', handleDidStopLoading);
    webview.addEventListener('did-fail-load', handleDidFailLoad);

    return () => {
      webview.removeEventListener('will-navigate', handleNavigation);
      webview.removeEventListener('did-navigate-in-page', handleDidNavigateInPage);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-start-navigation', handleDidStartNavigation);
      webview.removeEventListener('did-stop-loading', handleDidStopLoading);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
    };
  }, [currentUrl, useBrowserView, getBlockedMatch, trackNavigatedUrl, submissionMode, checkForSubmissionConfirmation]);

  /**
   * Update webview src when currentUrl changes
   */
  useEffect(() => {
    if (useBrowserView) return;

    const webview = (iframeRef.current as any)?.webviewElement;
    if (webview && webview.src !== currentUrl) {
      webview.src = currentUrl;
    }
  }, [currentUrl, useBrowserView]);

  useEffect(() => {
    if (!useBrowserView || !desktopApi) return;

    let mounted = true;
    const unsub = desktopApi.onBrowserViewState?.((payload) => {
      if (!mounted || !payload) return;
      const nextUrl = payload.url || '';
      if (nextUrl) {
        setCurrentUrl(nextUrl);
        setDisplayUrl(nextUrl);
      }
      setCanGoBack(!!payload.canGoBack);
      setCanGoForward(!!payload.canGoForward);
      setIsLoading(!!payload.isLoading);
      if (nextUrl) {
        trackNavigatedUrl(nextUrl).catch((error) => {
          console.error('BrowserView state tracking failed:', error);
        });
        if (submissionMode) {
          checkForSubmissionConfirmation(nextUrl, payload.title);
        }
      }
    });

    const unsubBlocked = desktopApi.onBrowserViewBlocked?.((payload) => {
      if (!mounted || !payload) return;
      setIsLoading(false);
      setBlockedAttempt({
        url: String(payload.url || ''),
        domain: String(payload.domain || ''),
        reason: String(payload.reason || 'blocked_domain'),
      });
    });

    desktopApi
      .browserViewCreate?.(currentUrl)
      .then((res) => {
        if (!mounted || !res?.ok || !res.state) return;
        const nextUrl = res.state.url || currentUrl;
        setCurrentUrl(nextUrl);
        setDisplayUrl(nextUrl);
        setCanGoBack(!!res.state.canGoBack);
        setCanGoForward(!!res.state.canGoForward);
        setIsLoading(!!res.state.isLoading);
      })
      .catch((error) => {
        console.error('BrowserView create failed:', error);
      });

    return () => {
      mounted = false;
      if (typeof unsub === 'function') unsub();
      if (typeof unsubBlocked === 'function') unsubBlocked();
      desktopApi.browserViewDestroy?.().catch((error) => {
        console.error('BrowserView destroy failed:', error);
      });
    };
  }, [useBrowserView, desktopApi, trackNavigatedUrl, submissionMode, checkForSubmissionConfirmation]);

  useEffect(() => {
    if (!useBrowserView || !desktopApi || !viewportRef.current) return;

    const element = viewportRef.current;

    const syncBounds = () => {
      const rect = element.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const x = Math.max(0, Math.floor(rect.left));
      const y = Math.max(0, Math.floor(rect.top));

      desktopApi.browserViewSetBounds?.({
        x,
        y,
        width,
        height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      }).catch((error) => {
        console.error('BrowserView setBounds failed:', error);
      });
    };

    const observer = new ResizeObserver(() => syncBounds());
    observer.observe(element);
    window.addEventListener('resize', syncBounds);
    window.addEventListener('scroll', syncBounds, true);

    syncBounds();
    requestAnimationFrame(syncBounds);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', syncBounds);
      window.removeEventListener('scroll', syncBounds, true);
    };
  }, [useBrowserView, desktopApi]);

  useEffect(() => {
    if (!useBrowserView || !desktopApi?.browserViewSetHidden) return;

    desktopApi.browserViewSetHidden(!!blockedAttempt).catch((error) => {
      console.error('BrowserView setHidden failed:', error);
    });
  }, [useBrowserView, desktopApi, blockedAttempt]);

  return (
    <div className="relative grid h-full w-full min-h-0 min-w-0 grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden bg-[#111827]">
      {blockedAttempt && (
        <div className="absolute left-1/2 top-3 z-[9999] w-[min(680px,92%)] -translate-x-1/2 rounded-lg border border-amber-500/40 bg-[#1f2937] shadow-2xl">
          <div className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-amber-300">Blocked URL Attempt</h3>
              <p className="mt-1 text-sm text-slate-200">
                Access to <strong>{blockedAttempt.domain || 'this domain'}</strong> is blocked during Assignment Mode.
              </p>
              <p className="mt-1 text-sm text-slate-200">Warning has also been sent to your administrator.</p>
              <p className="mt-2 break-all text-xs text-slate-400">Attempted URL: {blockedAttempt.url}</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-slate-300 hover:bg-[#334155]"
              onClick={() => setBlockedAttempt(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Tab Bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[#334155] bg-[#0f172a] px-2 py-1">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={cn(
                'group flex min-w-[130px] max-w-[220px] items-center gap-2 rounded-md border px-2 py-1 text-xs',
                tab.id === activeTabId
                  ? 'border-cyan-500/50 bg-[#1e293b] text-slate-100'
                  : 'border-[#334155] bg-[#111827] text-slate-300 hover:bg-[#1f2937]',
              )}
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => handleSelectTab(tab)}
                title={tab.url}
              >
                {tab.title}
              </button>
              {tabs.length > 1 && (
                <button
                  type="button"
                  className="rounded p-0.5 text-slate-400 hover:bg-[#334155] hover:text-slate-200"
                  onClick={() => handleCloseTab(tab.id)}
                  title="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-slate-300 hover:bg-[#334155]"
          onClick={() => handleOpenNewTab('https://www.google.com')}
          title="New tab"
        >
          +
        </Button>
      </div>

      {/* Browser Controls */}
      <div className="shrink-0 border-b border-[#334155] bg-[#1e293b] px-3 py-2">
        {submissionMode && submissionUrl && (
          <div className="mb-2 rounded-md border border-blue-400/30 bg-blue-950/50 px-3 py-2">
            <p className="flex items-center gap-2 text-xs text-blue-300">
              <Lock className="h-3 w-3" />
              <strong>Final Submission Step:</strong> Browser locked to submission page. No other pages can be opened.
            </p>
          </div>
        )}
        <form onSubmit={handleAddressBarSubmit} className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleBack}
            disabled={!canGoBack || isLoading || submissionMode}
            title="Go back"
            className="text-slate-300 hover:bg-[#334155]"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleForward}
            disabled={!canGoForward || isLoading || submissionMode}
            title="Go forward"
            className="text-slate-300 hover:bg-[#334155]"
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh page"
            className="text-slate-300 hover:bg-[#334155]"
          >
            <RotateCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-[#334155] bg-[#0f172a] px-3 py-1.5">
            <Lock className={cn('h-3 w-3 shrink-0', submissionMode ? 'text-blue-400' : 'text-green-400')} />
            <Input
              ref={addressBarRef}
              type="text"
              value={displayUrl}
              onChange={(e) => submissionMode ? undefined : setDisplayUrl(e.target.value)}
              disabled={submissionMode}
              placeholder={submissionMode ? "Submission URL locked" : "Enter URL or search term..."}
              className="h-auto border-0 bg-transparent p-0 text-sm text-slate-200 shadow-none focus-visible:ring-0 disabled:opacity-60"
            />
          </div>

          <Button size="sm" type="submit" disabled={isLoading || submissionMode} className="shrink-0 bg-cyan-600 text-white hover:bg-cyan-500">
            Go
          </Button>
        </form>
      </div>

      {/* Browser Content (Electron WebView - Full Browser Support) */}
      <div ref={viewportRef} className="relative h-full w-full min-h-0 min-w-0 overflow-hidden bg-[#0b1220]">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b1220]/80">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        )}

        {/* Webview Container - Native webview element will be created here */}
        <div
          ref={iframeRef}
          className="absolute inset-0 w-full h-full"
          data-testid="assignment-browser-container"
          style={{ width: '100%', height: '100%' }}
        />

        {/* Fallback for non-desktop environments */}
        {typeof window !== 'undefined' && !(window as any).humanfirstDesktop?.isDesktop && (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#0b1220] p-6 text-center">
            <AlertCircle className="mb-4 h-12 w-12 text-amber-500" />
            <h3 className="mb-2 text-lg font-semibold text-slate-100">Desktop App Required</h3>
            <p className="max-w-xs text-sm text-slate-400">
              Assignment Mode with full browser support requires the HumanFirst desktop application.
            </p>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex shrink-0 items-center gap-2 border-t border-[#334155] bg-[#1e293b] px-3 py-1 text-xs">
        <Globe className="h-3 w-3 text-slate-400" />
        <span className="truncate text-slate-400">{currentUrl}</span>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-slate-400">Secure</span>
        </div>
        <span className="text-slate-500">Assignment ID: {assignmentId || 'N/A'}</span>
      </div>
    </div>
  );
}

export default ControlledWebBrowser;
