import { Component } from 'react';

export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-rose-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
            Page error
          </p>
          <h1 className="mt-2 text-xl font-semibold text-slate-950">This page could not render</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Reload the application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
