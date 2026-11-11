import type { SpeechLanguage } from "../../../domain/SpeechLanguage";

const LANGUAGE_NAMES: Record<SpeechLanguage, string> = {
  "en-US": "English (US)",
  "pt-BR": "Portuguese (Brazil)",
};

type SpeechLanguageSelectorProps = {
  readonly language: SpeechLanguage;
  readonly onChange: (language: SpeechLanguage) => void;
};

export function SpeechLanguageSelector({ language, onChange }: SpeechLanguageSelectorProps) {
  return (
    <label className="speech-language">
      Speech language
      <select value={language} onChange={(event) => onChange(event.target.value as SpeechLanguage)}>
        {Object.entries(LANGUAGE_NAMES).map(([value, name]) => (
          <option key={value} value={value}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}
