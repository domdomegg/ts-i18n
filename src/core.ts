import { parseTree, Node } from 'jsonc-parser';
import { Position, SourceMapGenerator } from 'source-map';
import bannedNames from './bannedNames';

const originalOffset = Symbol.for('offset');
const generatedOffset = Symbol.for('generatedOffset');

// TODO: consider splitting this out into pre-and-post adding generated offsets
// TODO: consider refactoring to avoid cluttering the types with source map data
type LanguageType = {
  [key: string]: LanguageType | Set<string> & { [originalOffset]: number, [generatedOffset]?: number }
  [originalOffset]: number
  [generatedOffset]?: number
}

type LanguageDefinition = { [key: string]: LanguageDefinitionKey }
type LanguageDefinitionKey = LanguageDefinition | string

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
})

export type GenerateCoreOptions = { inputFiles: File[] } & GenerateCommonOptions & ({
  outputToInputPath: string, emitSourceMap?: true
} | {
  outputToInputPath?: string, emitSourceMap: false
})

export type File = { name: string, content: string }

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
  const languageType: LanguageType = inputFilesDefaultFirst.reduce<LanguageType>((acc, file) => {
    if (!file.name.endsWith('.json') && !file.name.endsWith('.jsonc')) throw new Error(`Input file names must end with .json, but received ${file.name}`);
    const parsedContent = parseTree(file.content);
    if (!parsedContent) throw new Error(`Invalid JSON in ${file.name}`);
    if (parsedContent.type !== 'object') throw new Error(`Expected JSON object in ${file.name}, but just got a ${parsedContent.type}`);

    const code = generateCode(parsedContent, acc, file === defaultLanguageFile);
    outputFiles.push({ name: `${withoutExt(file.name)}.ts`, content: code });
    return acc;
  }, { [originalOffset]: 0, [generatedOffset]: 199 });

  const typesContent = generateTypes(languageType, { errOnUnusedParam, includePlurals: false, emitSourceMap });
  outputFiles.push({ name: 'types.d.ts', content: typesContent });

  if (emitUtils) outputFiles.push({ name: 'utils.ts', content: generateUtils({ inputFiles, defaultLanguage }) });
  if (emitBrowser) outputFiles.push({ name: 'browser.ts', content: generateBrowser() });
  if (emitSourceMap) outputFiles.push({ name: 'types.d.ts.map', content: generateSourceMap(languageType, defaultLanguageFile.content, typesContent, `${outputToInputPath}/${defaultLanguageFile.name}`) });
  if (emitGitIgnore) outputFiles.push({ name: '.gitignore', content: `${outputFiles.map((f) => f.name).join('\n')}\n.gitignore` });

  return outputFiles;
};

const generateSourceMap = (languageType: LanguageType, originalContent: string, generatedContent: string, source: string): string => {
  const sourceMapGenerator = new SourceMapGenerator({ file: 'types.d.ts' });
  updateSourceMap(languageType, originalContent, generatedContent, sourceMapGenerator, source);
  return sourceMapGenerator.toString();
};

const updateSourceMap = (languageType: LanguageType | Set<string> & { [originalOffset]: number, [generatedOffset]?: number }, originalContent: string, generatedContent: string, sourceMapGenerator: SourceMapGenerator, source: string) => {
  sourceMapGenerator.addMapping({
    original: getPosition(originalContent, languageType[originalOffset]),
    generated: getPosition(generatedContent, languageType[generatedOffset]!),
    source,
  });

  if (languageType instanceof Set) return;

  Object.entries(languageType).forEach(([k, v]) => {
    updateSourceMap(v, originalContent, generatedContent, sourceMapGenerator, source);
  });
};

const getPosition = (str: string, offset: number): Position => {
  const lines = str.split('\n');
  let n = 0;
  for (let i = 0; i < lines.length; i++) {
    if (n + lines[i].length + 1 <= offset) {
      n += lines[i].length + 1;
    } else {
      return { line: i + 1, column: offset - n };
    }
  }
  throw new Error(`Offset ${offset} longer than string length ${str.length}`);
};

// Checks an object is a valid language definition, throwing if it isn't one
const asLanguageDefinition = (obj: unknown, errorIn?: string): LanguageDefinition => {
  if (Array.isArray(obj)) {
    throw new Error(`Invalid language definition as found array${errorIn ? ` (in ${errorIn})` : ''}`);
  }

  if (typeof obj !== 'object') {
    throw new Error(`Invalid language definition as found ${typeof obj}${errorIn ? ` (in ${errorIn})` : ''}`);
  }

  Object.entries(obj as { [key: string]: unknown }).forEach(([key, value]) => {
    if (!/[a-zA-Z_$][0-9a-zA-Z_$]*/.test(key)) throw new Error(`Invalid language definition due to bad key: '${key}'${errorIn ? ` (in ${errorIn})` : ''}`);

    if (typeof value !== 'string') {
      asLanguageDefinition(value, errorIn);
    }
  });

  return obj as LanguageDefinition;
};

/**
 * @param language The parsed language definition
 * @param languageType The constraints on the language type. Will be modified by this function to add any new type constraints.
 * @param isDefault Whether this is the default language
 * @returns code for the given language definition
 */
const generateCode = (language: Node, type: LanguageType, isDefault: boolean): string => (
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
const generateCodeFragment = (language: Node, type: LanguageType, isDefault: boolean, path = '') => {
  let code = '';
  if (language.type === 'object') {
    const key: string = language.parent ? language.parent!.children![0].value : undefined;
    if (key) {
      if (type[key] === undefined && isDefault) {
        type[key] = { [originalOffset]: language.parent!.children![0].offset + 1 };
      } else if (type[key] === undefined) {
        throw new Error(`Default language is missing entry at ${path}`);
      } else if (type[key] instanceof Set) {
        throw new Error(`Incompatible type, found both object and string at ${path}`);
      }
      type = type[key] as LanguageType;
    }
    code += `{\n${indent(language.children!.map((c) => generateCodeFragment(c, type, isDefault, path)).join(',\n'))},\n}`;
  } else if (language.type === 'property') {
    code += `${generateCodeFragment(language.children![0], type, isDefault, path)}: ${generateCodeFragment(language.children![1], type as LanguageType, isDefault, `${path}.${language.children![0].value}`)}`;
  } else if (language.type === 'string' && language === language.parent!.children![0]) { // property key
    code += language.value;
  } else if (language.type === 'string' && language === language.parent!.children![1]) { // string value
    const stringified = JSON.stringify(language.value);

    // TODO: come up with a way of escaping parameters
    const params = [...new Set([...stringified.matchAll(/\{\{[a-zA-Z_$][0-9a-zA-Z_$]*\}\}/g)].map((match) => match[0].slice(2, -2)))];
    params.forEach((param) => {
      if (bannedNames.includes(param)) throw new Error(`Cannot use param name '${param}' as it is a reserved word`);
    });
    const key: string = language.parent!.children![0].value;
    const hasPlural = language.parent!.parent!.children!.some((c) => c.type === 'property' && c.children![0].value === `${key}_plural`);

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
      type[singularKey][originalOffset] = language.parent!.children![0].offset + 1;
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
const generateTypes = (languageType: LanguageType, options: { errOnUnusedParam: boolean, includePlurals: boolean, emitSourceMap: boolean }) => (
  `${'// Do not edit directly, this is generated by ts-i18n\n'
  + '/* eslint-disable */\n'
  + 'export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]; }\n'
  + 'export interface Language '}${generateTypeFragment(languageType, 199, options)}${options.emitSourceMap ? '\n//# sourceMappingURL=types.d.ts.map' : ''}\n`
);

const generateTypeFragment = (languageType: LanguageType | Set<string>, offset: number, options: { errOnUnusedParam: boolean, includePlurals: boolean }) => {
  let code = '';
  if (languageType instanceof Set && languageType.size === 0) {
    code += `(${options.errOnUnusedParam ? '' : 'p?: { [key: string]: string | number }'}) => string`;
  } else if (languageType instanceof Set) {
    code += `(p: { ${[...languageType].map((p) => (p === 'count' ? `${p}: number` : `${p}: string | number`)).join(', ')}${options.errOnUnusedParam ? '' : ', [key: string]: string | number'} }) => string`;
  } else {
    offset += 2;
    code += `{\n${Object.entries(languageType).filter(([k, v]) => options.includePlurals || !k.endsWith('_plural')).map(([k, v]) => {
      v[generatedOffset] = offset;
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
for (let i = preferredLanguages.length; i > 0; i--) {
  const key = preferredLanguages[i] as keyof typeof languages
  if (key in languages) {
    language = merge(languages[key], language)
  }
}

export default language
`;

const indent = (str: string): string => str.split('\n').map((line) => (line.length ? `  ${line}` : line)).join('\n');

const withoutExt = (filename: string): string => filename.slice(0, filename.lastIndexOf('.'));
