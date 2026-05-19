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
  pluginId: string;
  variantExpected: string;
  variantHint?: string;
  offending: string;
  message: string;
}

export interface Config {
  locales: Record<string, string>;
  ignore: string[];
  allowStrings: Set<string>;
  allowChars: Set<string>;
  plugins: string[] | null;
}

export interface ResolvedFile {
  path: string;
  variant: string;
  pluginId: string;
}
