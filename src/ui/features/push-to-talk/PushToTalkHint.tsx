type PushToTalkHintProps = {
  readonly supported: boolean;
  readonly hasApiKey: boolean;
};

export function PushToTalkHint({ supported, hasApiKey }: PushToTalkHintProps) {
  if (!supported) {
    return (
      <p className="push-to-talk-hint" role="alert">
        This browser cannot transcribe speech. Use Chrome, Edge or Safari.
      </p>
    );
  }

  return (
    <p className="push-to-talk-hint" data-enabled={hasApiKey}>
      {hasApiKey ? "Hold Space and speak." : "Enter your Anthropic API key to start."}
    </p>
  );
}
