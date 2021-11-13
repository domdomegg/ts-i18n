import { readdirSync, readFileSync, rmdirSync, existsSync, copyFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import { generateFs } from '../src/fsGenerator';

beforeEach(() => {
  // Using existsSync and rmdirSync instead of rmSync to support Node 12
  if (existsSync(resolve('test/generated'))) {
    rmdirSync(resolve('test/generated'), { recursive: true });
  }
});

test.each([
  ['simple', { langs: ['en', 'fr'] }],
  ['large', { langs: ['en', 'fr'] }],
  ['jsonc', { langs: ['en'] }],
  ['paramInPluralOnly', { langs: ['en'] }],
  ['paramInNonDefaultLangOnly', { langs: ['en', 'fr'] }],
])('fsGenerator generates correct files: %s', (dir, { langs }) => {
  generateFs({
    inputDirectory: `test/resources/${dir}`,
    outputDirectory: 'test/generated',
  });

  expect(readdirSync(resolve(__dirname, './generated/'))).toHaveLength(5 + langs.length);
  langs.forEach((lang) => {
    expect(readFileSync(resolve(__dirname, `./generated/${lang}.ts`), { encoding: 'utf-8' })).toMatchSnapshot();
  });
  expect(readFileSync(resolve(__dirname, './generated/types.d.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/utils.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/browser.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/.gitignore'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/types.d.ts.map'), { encoding: 'utf-8' })).toMatchSnapshot();
});

test.each([
  ['errInvalidJSON', { err: 'Invalid JSON in en.json' }],
  ['errTopLevelString', { err: 'Expected JSON object in en.json, but just got a string' }],
  ['errTopLevelArray', { err: 'Expected JSON object in en.json, but just got a array' }],
  ['errContainsArray', { err: 'Unsupported type in language definition: array' }],
  ['errTopLevelNumber', { err: 'Expected JSON object in en.json, but just got a number' }],
  ['errContainsNumber', { err: 'Unsupported type in language definition: number' }],
  ['errTopLevelBoolean', { err: 'Expected JSON object in en.json, but just got a boolean' }],
  ['errContainsBoolean', { err: 'Unsupported type in language definition: boolean' }],
  ['errTopLevelNull', { err: 'Expected JSON object in en.json, but just got a null' }],
  ['errContainsNull', { err: 'Unsupported type in language definition: null' }],
  ['errContainsNestedNumberInNonDefaultLang', { err: 'Unsupported type in language definition: number' }],
  ['errKeyInNonDefaultNotInDefaultLang', { err: 'Default language is missing entry at .no' }],
  ['errNestedKeyInNonDefaultNotInDefaultLang', { err: 'Default language is missing entry at .thisLanguage.hasNested.extra' }],
  ['nonExistentDirectoy', { err: 'no such file or directory' }],
  ['noFiles', { err: 'No language files found' }],
  ['missingDefault', { err: 'Default language file does not exist' }],
])('fsGenerator throws correct errors: %s', (dir, { err }) => {
  expect(() => generateFs({
    inputDirectory: `test/resources/${dir}`,
    outputDirectory: 'test/generated',
  })).toThrowError(err);
});

test('handles output and input dir being the same', () => {
  const langs = ['en', 'fr'];

  mkdirSync(resolve(__dirname, './generated/'));
  readdirSync(resolve(__dirname, './resources/simple')).forEach((f) => copyFileSync(resolve(__dirname, './resources/simple', f), resolve(__dirname, './generated/', f)));

  generateFs({
    inputDirectory: 'test/generated',
    outputDirectory: 'test/generated',
  });

  expect(readdirSync(resolve(__dirname, './generated/'))).toHaveLength(5 + langs.length * 2);
  langs.forEach((lang) => {
    expect(readFileSync(resolve(__dirname, `./generated/${lang}.ts`), { encoding: 'utf-8' })).toMatchSnapshot();
  });
  expect(readFileSync(resolve(__dirname, './generated/types.d.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/utils.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/browser.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/.gitignore'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/types.d.ts.map'), { encoding: 'utf-8' })).toMatchSnapshot();
});
