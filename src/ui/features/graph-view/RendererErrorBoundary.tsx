import { Component, type ReactNode } from "react";

type RendererErrorBoundaryProps = {
  /** A new value (the next graph) clears the error and tries to draw again. */
  readonly resetKey: unknown;
  readonly children: ReactNode;
};

type RendererErrorBoundaryState = {
  readonly resetKey: unknown;
  readonly hasError: boolean;
};

/** Error boundaries can only be class components in React. */
export class RendererErrorBoundary extends Component<RendererErrorBoundaryProps, RendererErrorBoundaryState> {
  state: RendererErrorBoundaryState = { resetKey: this.props.resetKey, hasError: false };

  static getDerivedStateFromProps(
    props: RendererErrorBoundaryProps,
    state: RendererErrorBoundaryState,
  ): Partial<RendererErrorBoundaryState> | null {
    return props.resetKey === state.resetKey ? null : { resetKey: props.resetKey, hasError: false };
  }

  static getDerivedStateFromError(): Partial<RendererErrorBoundaryState> {
    return { hasError: true };
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <p className="graph-view-error" role="alert">
          Could not draw the map.
        </p>
      );
    }
    return this.props.children;
  }
}
