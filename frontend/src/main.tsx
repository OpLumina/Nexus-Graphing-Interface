import { StrictMode, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "./ui/Layout";
import "katex/dist/katex.min.css";

interface ErrorState { error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorState> {
  state: ErrorState = { error: null };
  static getDerivedStateFromError(error: Error): ErrorState { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 32, fontFamily: "monospace", color: "#ff6b6b",
          background: "#1a1a1a", minHeight: "100vh",
        }}>
          <div style={{ fontSize: 16, marginBottom: 12 }}>NexusGraph failed to start</div>
          <pre style={{ fontSize: 12, whiteSpace: "pre-wrap", color: "#ffaaaa" }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  </StrictMode>
);
