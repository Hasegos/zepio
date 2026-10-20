import { Component } from "react";

/**
 * 게임 화면에서 렌더링 중 던져진 예외를 잡아 빈 화면 대신 안내와 다시 시도 버튼을 보여 준다.
 * 오류는 콘솔에만 남기고 어디로도 보내지 않는다. 다시 시도하면 게임을 처음 상태로 새로 그린다.
 */
export default class GameErrorBoundary extends Component {
  state = { failed: false, attempt: 0 };

  /** 렌더 중 예외가 나면 실패 상태로 바꾼다. */
  static getDerivedStateFromError() {
    return { failed: true };
  }

  /**
   * 잡은 오류를 콘솔에 남긴다.
   *
   * @param error 던져진 오류
   */
  componentDidCatch(error) {
    console.error("[game] render failed", error);
  }

  /** 실패 상태를 풀고 자식을 새로 그린다. */
  retry = () => {
    this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }));
  };

  /** 실패하면 안내 화면을, 아니면 자식을 그린다. */
  render() {
    if (this.state.failed) {
      return (
        <div role="alert" className="flex flex-col items-center gap-3 p-8 text-center">
          <p>게임에서 문제가 생겼어요.</p>
          <button type="button" onClick={this.retry} className="btn-primary">
            다시 시도
          </button>
        </div>
      );
    }
    return <div key={this.state.attempt} className="contents">{this.props.children}</div>;
  }
}