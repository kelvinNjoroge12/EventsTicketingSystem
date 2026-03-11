import React from 'react';

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
        // TODO: send to Sentry or another telemetry service
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
                                className="px-6 py-2 bg-[#1E4DB7]/10 text-[#1E4DB7] rounded-full hover:bg-[#1E4DB7]/20 font-medium transition-colors"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-[#1E4DB7] text-white rounded-full hover:bg-[#1E4DB7]/90 font-medium transition-colors"
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
