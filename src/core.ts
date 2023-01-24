import { parseTree, Node } from 'jsonc-parser';
import { Position, SourceMapGenerator } from 'source-map';
import bannedNames from './bannedNames';

const originalOffset = Symbol.for('offset');
const generatedOffset = Symbol.for('generatedOffset');

type LanguageIRProcessedType = {
  [key: string]:
  // Nested section
  | LanguageIRProcessedType
  // Entry: set of parameters
  | Set<string> & { [originalOffset]: number }

  [originalOffset]: number
};

type LanguageIRGeneratedType = {
  [key: string]:
  // Nested section
  | LanguageIRGeneratedType
  // Entry: set of parameters
  | Set<string> & { [originalOffset]: number, [generatedOffset]: number }

  [originalOffset]: number
  [generatedOffset]: number
};

type LanguageDefinition = { [key: string]: LanguageDefinitionKey };
type LanguageDefinitionKey = LanguageDefinition | string;

export type GenerateCommonOptions = {
  defaultLanguage?: string;
  errOnUnusedParam?: boolean;
  emitGitIgnore?: boolean;
  emitSourceMap?: boolean;
} & ({
  emitUtils: false;
  emitBrowser: false;
} | {
  emitUtils?: true;
  emitBrowser?: boolean;
});

export type GenerateCoreOptions = { inputFiles: File[] } & GenerateCommonOptions & ({
  outputToInputPath: string, emitSourceMap?: true
} | {
  outputToInputPath?: string, emitSourceMap: false
});

export type File = { name: string, content: string };

export const generateCore = ({
  inputFiles,
  defaultLanguage = 'en',
  errOnUnusedParam = false,
  emitGitIgnore = true,
  emitUtils = true,
  emitBrowser = true,
  emitSourceMap = true,
  outputToInputPath,
}: GenerateCoreOptions): File[] => {
  const outputFiles: File[] = [];

  if (new Set(inputFiles.map((f) => f.name)).size !== inputFiles.length) {
    throw new Error('Duplicate input file name');
  }

  const defaultLanguageFile = inputFiles.find((f) => withoutExt(f.name) === defaultLanguage);
  if (!defaultLanguageFile) {
    throw new Error(`Default language file does not exist (expected ${defaultLanguage}.json)`);
  }

  const inputFilesDefaultFirst = [defaultLanguageFile, ...inputFiles.filter((f) => f !== defaultLanguageFile)];
  const languageTypeProcessed: LanguageIRProcessedType = inputFilesDefaultFirst.reduce<LanguageIRProcessedType>((acc, file) => {
    if (!file.name.endsWith('.json') && !file.name.endsWith('.jsonc')) throw new Error(`Input file names must end with .json, but received ${file.name}`);
    const parsedContent = parseTree(file.content);
    if (!parsedContent) throw new Error(`Invalid JSON in ${file.name}`);
    if (parsedContent.type !== 'object') throw new Error(`Expected JSON object in ${file.name}, but just got a ${parsedContent.type}`);

    const code = generateCode(parsedContent, acc, file === defaultLanguageFile);
    outputFiles.push({ name: `${withoutExt(file.name)}.ts`, content: code });
    return acc;
  }, { [originalOffset]: 0, [generatedOffset]: 199 });

  const typesContent = generateTypes(languageTypeProcessed, { errOnUnusedParam, includePlurals: false, emitSourceMap });
  const languageTypeGenerated = languageTypeProcessed as LanguageIRGeneratedType;
  outputFiles.push({ name: 'types.d.ts', content: typesContent });

  if (emitUtils) outputFiles.push({ name: 'utils.ts', content: generateUtils({ inputFiles, defaultLanguage }) });
  if (emitBrowser) outputFiles.push({ name: 'browser.ts', content: generateBrowser() });
  if (emitSourceMap) outputFiles.push({ name: 'types.d.ts.map', content: generateSourceMap(languageTypeGenerated, defaultLanguageFile.content, typesContent, `${outputToInputPath || '.'}/${defaultLanguageFile.name}`) });
  if (emitGitIgnore) outputFiles.push({ name: '.gitignore', content: `${outputFiles.map((f) => f.name).join('\n')}\n.gitignore` });

  return outputFiles;
};

const generateSourceMap = (languageType: LanguageIRGeneratedType, originalContent: string, generatedContent: string, source: string): string => {
  const sourceMapGenerator = new SourceMapGenerator({ file: 'types.d.ts' });
  updateSourceMap(languageType, originalContent, generatedContent, sourceMapGenerator, source);
  return sourceMapGenerator.toString();
};

const updateSourceMap = (languageType: LanguageIRGeneratedType[string], originalContent: string, generatedContent: string, sourceMapGenerator: SourceMapGenerator, source: string) => {
  sourceMapGenerator.addMapping({
    original: getPosition(originalContent, languageType[originalOffset]),
    generated: getPosition(generatedContent, languageType[generatedOffset]),
    source,
  });

  if (languageType instanceof Set) return;

  Object.entries(languageType).forEach(([, v]) => {
    updateSourceMap(v, originalContent, generatedContent, sourceMapGenerator, source);
  });
};

const getPosition = (str: string, offset: number): Position => {
  const lines = str.split('\n');
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const line = lines[i]!;
    if (n + line.length + 1 <= offset) {
      n += line.length + 1;
    } else {
      return { line: i + 1, column: offset - n };
    }
  }
  throw new Error(`Offset ${offset} longer than string length ${str.length}`);
};

/**
 * @param language The parsed language definition
 * @param languageType The constraints on the language type. Will be modified by this function to add any new type constraints.
 * @param isDefault Whether this is the default language
 * @returns code for the given language definition
 */
const generateCode = (language: Node, type: LanguageIRProcessedType, isDefault: boolean): string => (
  `// Do not edit directly, this is generated by ts-i18n
/* eslint-disable */
import { Language${isDefault ? '' : ', DeepPartial'} } from "./types"
const lang = ${generateCodeFragment(language, type, isDefault)}
export default lang as ${(isDefault ? 'Language' : 'DeepPartial<Language>')}\n`
);

/**
 * @param language A language definition
 * @param languageType The constraints on the language type. Will be modified by this function to add any new type constraints.
 * @param path Path in the language definition we are at if this is a recursive call, to improve error messaging
 * @returns fragment of code for the given language definition, and updated constraints on the language type
 */
/* eslint-disable no-param-reassign */
const generateCodeFragment = (language: Node, type: LanguageIRProcessedType, isDefault: boolean, path = '') => {
  let code = '';
  if (language.type === 'object') {
    const key: string | undefined = language.parent?.children?.[0]?.value;
    if (key) {
      if (type[key] === undefined && isDefault) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        type[key] = { [originalOffset]: language.parent!.children![0]!.offset + 1 };
      } else if (type[key] === undefined) {
        throw new Error(`Default language is missing entry at ${path}`);
      } else if (type[key] instanceof Set) {
        throw new Error(`Incompatible type, found both object and string at ${path}`);
      }
      type = type[key] as LanguageIRProcessedType;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    code += `{\n${indent(language.children!.map((c) => generateCodeFragment(c, type, isDefault, path)).join(',\n'))},\n}`;
  } else if (language.type === 'property') {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    code += `${generateCodeFragment(language.children![0]!, type, isDefault, path)}: ${generateCodeFragment(language.children![1]!, type as LanguageIRProcessedType, isDefault, `${path}.${language.children![0]!.value}`)}`;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  } else if (language.type === 'string' && language === language.parent!.children![0]) { // property key
    code += language.value;
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  } else if (language.type === 'string' && language === language.parent!.children![1]) { // string value
    const stringified = JSON.stringify(language.value);

    // TODO: come up with a way of escaping parameters
    const params = [...new Set([...stringified.matchAll(/\{\{[a-zA-Z_$][0-9a-zA-Z_$]*\}\}/g)].map((match) => match[0].slice(2, -2)))];
    params.forEach((param) => {
      if (bannedNames.includes(param)) throw new Error(`Cannot use param name '${param}' as it is a reserved word`);
    });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const key: string = language.parent!.children![0]!.value;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const hasPlural = language.parent!.parent!.children!.some((c) => c.type === 'property' && c.children![0]!.value === `${key}_plural`);

    if (params.length && hasPlural) {
      const countRequired = params.includes('count');
      if (!countRequired) params.push('count');

      const parentPath = path.slice(0, path.lastIndexOf('.'));
      const body = `p.count === 1 ? (${stringified.replace(/\{\{([a-zA-Z_$][0-9a-zA-Z_$]*)\}\}/g, '" + p.$1.toString() + "')}) : lang${parentPath}.${key}_plural(p)`;
      code += `(p: { ${params.map((p) => (p === 'count' ? `${p + (countRequired ? '' : '?')}: number` : `${p}: string | number`)).join(', ')} }): string => ${body}`;
    } else if (params.length) {
      const body = stringified.replace(/\{\{([a-zA-Z_$][0-9a-zA-Z_$]*)\}\}/g, '" + p.$1.toString() + "');
      code += `(p: { ${params.map((p) => `${p}: string | number`).join(', ')} }): string => ${body}`;
    } else {
      code += `(): string => ${stringified}`;
    }

    const singularKey = key.endsWith('_plural') ? key.slice(0, -('_plural'.length)) : key;
    if (type[singularKey] === undefined && isDefault) {
      type[singularKey] = new Set(params) as Set<string> & { [originalOffset]: number };
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      type[singularKey]![originalOffset] = language.parent!.children![0]!.offset + 1;
    } else if (type[singularKey] === undefined) {
      throw new Error(`Default language is missing entry at ${path}`);
    } else if (type[singularKey] instanceof Set) {
      params.forEach((p) => (type[singularKey] as Set<string>).add(p));
    } else {
      throw new Error(`Incompatible type, found both object and string at ${path}`);
    }
  } else {
    throw new Error(`Unsupported type in language definition: ${language.type}`);
  }
  return code;
};

/**
 * @param languageType The constraints on the language type. Will be modified by this function to add generated offsets.
 * @returns type declaration code for the given language definition
 */
/* eslint-disable no-param-reassign */
const generateTypes = (languageType: LanguageIRProcessedType, options: { errOnUnusedParam: boolean, includePlurals: boolean, emitSourceMap: boolean }) => (
  `${'// Do not edit directly, this is generated by ts-i18n\n'
  + '/* eslint-disable */\n'
  + 'export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]; }\n'
  + 'export interface Language '}${generateTypeFragment(languageType, 199, options)}${options.emitSourceMap ? '\n//# sourceMappingURL=types.d.ts.map' : ''}\n`
);

const generateTypeFragment = (languageType: LanguageIRProcessedType[string], offset: number, options: { errOnUnusedParam: boolean, includePlurals: boolean }) => {
  let code = '';
  if (languageType instanceof Set && languageType.size === 0) {
    code += `(${options.errOnUnusedParam ? '' : 'p?: { [key: string]: string | number }'}) => string`;
  } else if (languageType instanceof Set) {
    code += `(p: { ${[...languageType].map((p) => (p === 'count' ? `${p}: number` : `${p}: string | number`)).join(', ')}${options.errOnUnusedParam ? '' : ', [key: string]: string | number'} }) => string`;
  } else {
    offset += 2;
    code += `{\n${Object.entries(languageType).filter(([k]) => options.includePlurals || !k.endsWith('_plural')).map(([k, v]) => {
      (v as LanguageIRGeneratedType)[generatedOffset] = offset;
      const r = `${k}: ${generateTypeFragment(v, offset + `${k}: `.length, options)}`;
      offset += r.length + 2;
      return r;
    }).join(',\n')},\n}`;
  }
  return code;
};

const generateUtils = (options: { inputFiles: File[], defaultLanguage: string }) => `// Do not edit directly, this is generated by ts-i18n
/* eslint-disable */
${options.inputFiles.map((f) => `import ${withoutExt(f.name)} from './${withoutExt(f.name)}'\n`).join('')}import { Language, DeepPartial } from './types'

/**
 * Merges two languages together, preferring the preferred language where possible
 * @param preferredLang The preferred language. NB: may be modified
 * @param defaultLang The default language. NB: may be modified
 */
export const merge = (preferredLang: DeepPartial<Language>, defaultLang: Language): Language => {
  for (const key in defaultLang) {
    if (key in preferredLang) {
      if (typeof (preferredLang as any)[key] === 'object') {
        (preferredLang as any)[key] = merge((preferredLang as any)[key], (defaultLang as any)[key])
      }
    } else {
      (preferredLang as any)[key] = (defaultLang as any)[key]
    }
  }
  return preferredLang as Language
}

export const languages = { ${options.inputFiles.map((f) => withoutExt(f.name)).join(', ')} }

export const defaultLanguage = ${options.defaultLanguage}

export const defaultLanguageCode = ${JSON.stringify(options.defaultLanguage)}`;

const generateBrowser = () => `// Do not edit directly, this is generated by ts-i18n
/* eslint-disable */
import { merge, languages, defaultLanguage } from './utils'
import { Language } from './types'

// Preferred languages, as specified by the user's browser
const preferredLanguages =
  ((navigator.languages ? navigator.languages : [navigator.language]) ?? [])
    .flatMap(lang => lang.length > 2 ? [lang, lang.slice(0, 2)] : lang)
    .filter((l, i, arr) => arr.indexOf(l) === i)
    .slice(0, 25)

let language: Language = defaultLanguage // fallback language
for (let i = preferredLanguages.length; i >= 0; i--) {
  const key = preferredLanguages[i] as keyof typeof languages
  if (key in languages) {
    language = merge(languages[key], language)
  }
}

export default language
`;

const indent = (str: string): string => str.split('\n').map((line) => (line.length ? `  ${line}` : line)).join('\n');

const withoutExt = (filename: string): string => filename.slice(0, filename.lastIndexOf('.'));
