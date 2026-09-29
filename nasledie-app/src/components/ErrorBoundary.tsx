import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** что показать вместо упавшего блока; по умолчанию — сообщение об ошибке */
  fallback?: ReactNode;
}

/** Не даёт сбою одного блока (например, 3D без WebGL) погасить весь сайт */
export class ErrorBoundary extends Component<Props, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <div className="container-page pt-32 text-center">
        <h1 className="text-3xl font-bold">Не удалось показать этот экран</h1>
        <p className="mt-3 text-muted">Перезагрузите страницу. Если ошибка повторяется, пришлите текст ниже разработчику.</p>
        <pre className="mx-auto mt-6 max-w-2xl overflow-x-auto whitespace-pre-wrap rounded-xl bg-card p-4 text-left text-xs text-danger">
          {this.state.error.message}
        </pre>
        <button
          className="mt-6 rounded-xl border border-line px-5 py-2.5 hover:border-gold"
          onClick={() => this.setState({ error: null })}
        >
          Попробовать снова
        </button>
      </div>
    );
  }
}

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
