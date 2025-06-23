const SETTINGS_REGEX =
  /^(?:please )?set (?:the)? (language|personality) to (\w+)/i;

let globalSkipSpeech = false;

class Language {
  static EN = 'en';
  static IT = 'it';
  static JA = 'ja';

  static language = this.EN;

  static get() {
    return Language.language;
  }

  static set(lang) {
    Language.language = lang;
  }

  // static toCode(lang) {
  //   // TODO
  // }

  // static toValue(langCode) {
  //   // TODO
  // }
}

class Persona {
  static persona = 'normal';

  static get() {
    return Persona.persona;
  }

  static set(newPersona) {
    Persona.persona = newPersona;
  }
}

function updateSettings(transcript) {
  const [, setting, value] = transcript.match(SETTINGS_REGEX);
  console.log('setting', setting);
  console.log('value', value);

  if (setting === 'language') {
    // TODO: Replace with toCode
    const langMap = {
      english: Language.EN,
      italian: Language.IT,
      japanese: Language.JA,
    };

    const newLang = langMap[value.toLowerCase()] || Language.EN;
    console.log('newLang', newLang);

    Language.set(newLang);
  }

  return {
    message: `Settings updated: Language ${Language.get()}`,
    skipSpeech: true,
  };
}

module.exports = {
  Language,
  Persona,
  updateSettings,
  SETTINGS_REGEX,
  globalSkipSpeech,
};
