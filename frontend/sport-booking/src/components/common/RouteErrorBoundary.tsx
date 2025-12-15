import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error | null;
};

class RouteErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RouteErrorBoundary', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="detail-card">
          <h2>Щось пішло не так</h2>
          <p>{this.state.error?.message ?? 'Невідома помилка.'}</p>
          <div className="badges-row">
            <button type="button" className="primary-button" onClick={() => window.location.reload()}>
              Перезавантажити сторінку
            </button>
            <button type="button" className="ghost-button" onClick={this.handleReset}>
              Спробувати ще раз
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;

