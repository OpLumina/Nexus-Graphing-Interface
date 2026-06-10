import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import { Layout } from "./ui/Layout";
import "katex/dist/katex.min.css";
class ErrorBoundary extends Component {
    state = { error: null };
    static getDerivedStateFromError(error) { return { error }; }
    render() {
        if (this.state.error) {
            return (_jsxs("div", { style: {
                    padding: 32, fontFamily: "monospace", color: "#ff6b6b",
                    background: "#1a1a1a", minHeight: "100vh",
                }, children: [_jsx("div", { style: { fontSize: 16, marginBottom: 12 }, children: "NexusGraph failed to start" }), _jsxs("pre", { style: { fontSize: 12, whiteSpace: "pre-wrap", color: "#ffaaaa" }, children: [this.state.error.message, "\n\n", this.state.error.stack] })] }));
        }
        return this.props.children;
    }
}
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsx(ErrorBoundary, { children: _jsx(Layout, {}) }) }));
