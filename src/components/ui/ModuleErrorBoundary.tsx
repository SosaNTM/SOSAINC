import React from "react";

interface Props {
  moduleName: string;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ModuleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.moduleName}] Error:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          minHeight: 200,
          color: "rgba(255,255,255,0.6)",
          fontFamily: "'Space Mono', monospace",
        }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            Something went wrong in {this.props.moduleName}.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              background: "#e8ff00",
              color: "#000",
              border: "none",
              borderRadius: 6,
              padding: "6px 16px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: 12,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
