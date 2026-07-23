import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          dir="rtl"
          className="min-h-[200px] flex flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <div className="text-4xl">⚠️</div>
          <p className="text-lg font-semibold text-gray-800">حدث خطأ غير متوقع</p>
          <p className="text-sm text-gray-500">
            {this.state.error?.message ?? "يرجى تحديث الصفحة أو المحاولة لاحقاً"}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700 transition-colors"
          >
            حاول مجدداً
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
