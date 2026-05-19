const plugin = {
  id: 'mock',
  name: 'Mock Plugin',
  locales: [['**/mock.lproj', 'mock-variant']],
  detect(input) {
    if (input.allowStrings.has(input.entry.value)) return [];
    const violations = [];
    for (let i = 0; i < input.entry.valueChars.length; i++) {
      const ch = input.entry.valueChars[i];
      if (ch !== '!') continue;
      if (input.allowChars.has(ch)) continue;
      violations.push({
        file: input.file,
        line: input.entry.charLines[i] ?? input.entry.valueLine,
        col: input.entry.charCols[i] ?? input.entry.valueCol,
        key: input.entry.key,
        pluginId: 'mock',
        variantExpected: input.variant,
        offending: ch,
        message: `forbidden "!" in ${input.variant} file (key="${input.entry.key}")`,
      });
    }
    return violations;
  },
};

export default plugin;
