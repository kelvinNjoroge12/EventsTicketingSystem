import React from 'react';
import { API_BASE_URL } from '../../lib/apiClient';

const ERROR_REPORT_ENABLED =
    import.meta.env.PROD && import.meta.env.VITE_ERROR_REPORT_ENABLED !== 'false';
const ERROR_REPORT_URL =
    import.meta.env.VITE_ERROR_REPORT_URL ||
    (API_BASE_URL ? `${API_BASE_URL}/api/analytics/frontend-error/` : null);

const reportClientError = (error, errorInfo) => {
    if (!ERROR_REPORT_ENABLED || !ERROR_REPORT_URL) return;

    const payload = {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack || '',
        componentStack: errorInfo?.componentStack || '',
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
        severity: 'error',
    };

    try {
        const body = JSON.stringify(payload);
        if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
            const blob = new Blob([body], { type: 'application/json' });
            navigator.sendBeacon(ERROR_REPORT_URL, blob);
            return;
        }
        fetch(ERROR_REPORT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
            credentials: 'include',
        }).catch(() => {});
    } catch {
        // Swallow telemetry failures
    }
};

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidUpdate(prevProps) {
        // Reset the boundary whenever the route changes.
        // The parent must pass a `locationKey` prop (e.g. location.key from useLocation)
        // so the boundary knows a navigation happened.
        if (this.state.hasError && prevProps.locationKey !== this.props.locationKey) {
            this.setState({ hasError: false, error: null });
        }
    }

    componentDidCatch(error, errorInfo) {
        console.error("Global Error Caught:", error, errorInfo);
        reportClientError(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] p-4 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow border border-[#E2E8F0] max-w-md w-full">
                        <h1 className="text-2xl font-bold text-[#0F172A] mb-4">Oops! Something went wrong.</h1>
                        <p className="text-[#64748B] mb-6">
                            A critical error occurred while loading this page. This could be due to a network connection issue or an unexpected state.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => this.setState({ hasError: false, error: null })}
                                className="px-6 py-2 bg-[#02338D]/10 text-[#02338D] rounded-full hover:bg-[#02338D]/20 font-medium transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-[#02338D] text-white rounded-full hover:bg-[#02338D]/90 font-medium transition-colors"
                            >
                                Refresh Page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

