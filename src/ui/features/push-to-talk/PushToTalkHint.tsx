type PushToTalkHintProps = {
  readonly enabled: boolean;
};

export function PushToTalkHint({ enabled }: PushToTalkHintProps) {
  return (
    <p className="push-to-talk-hint" data-enabled={enabled}>
      {enabled ? "Hold Space and speak." : "Enter your Anthropic API key to start."}
    </p>
  );
}
