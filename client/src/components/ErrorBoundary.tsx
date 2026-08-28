import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell flex min-h-screen items-center justify-center p-6">
          <section className="paper-panel max-w-xl p-7 text-center sm:p-10" role="alert">
            <div className="source-stamp mx-auto"><AlertTriangle size={24} className="text-[#87571a]" /></div>
            <p className="mono mt-5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#87571a]">Estado a confirmar</p>
            <h1 className="display-serif mt-2 text-3xl text-[#20383f]">A tela precisou ser reiniciada.</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#5e7076]">Nenhuma ação de correção foi aplicada automaticamente. Atualize o painel para retomar o trabalho e, se o problema persistir, tente novamente com o conteúdo de origem preservado.</p>
            <button onClick={() => window.location.reload()} className="primary-button mx-auto mt-6"><RotateCcw size={16} /> Recarregar painel</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
