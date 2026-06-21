import React from "react";

/**
 * React Error Boundary — catches rendering errors in children and shows recovery UI.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6" role="alert">
          <div className="glass-card rounded-[24px] p-8 max-w-md w-full text-center space-y-4">
            <div className="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[32px]">error</span>
            </div>
            <h2 className="text-headline-md font-headline-md text-primary">
              Something went wrong
            </h2>
            <p className="text-body-md text-on-surface-variant">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {this.state.error?.message && (
              <details className="text-left bg-surface-container-low rounded-lg p-3 text-label-sm text-outline">
                <summary className="cursor-pointer font-semibold">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReset}
                className="bg-primary text-on-primary px-5 py-3 rounded-lg font-label-md text-label-md hover:bg-primary/95 transition-colors shadow-sm"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-surface border border-outline-variant/40 text-on-surface px-5 py-3 rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors"
              >
                Reload Page
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
