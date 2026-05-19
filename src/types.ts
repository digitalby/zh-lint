export type Script = 'simplified' | 'traditional';

export type OutputFormat = 'xcode' | 'github' | 'plain' | 'json';

export interface StringEntry {
  key: string;
  value: string;
  valueLine: number;
  valueCol: number;
}

export interface Violation {
  file: string;
  line: number;
  col: number;
  key: string;
  char: string;
  expectedScript: Script;
  actualScriptHint: Script;
  message: string;
}

export interface Config {
  locales: Record<string, Script>;
  ignore: string[];
  allowStrings: Set<string>;
  allowChars: Set<string>;
}

export interface ResolvedFile {
  path: string;
  expectedScript: Script;
}
