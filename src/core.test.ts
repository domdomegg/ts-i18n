import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateCore } from './core';

const getFile = (path: string) => {
  const pathParts = path.split('/');
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const name = pathParts[pathParts.length - 1]!;
  const content = readFileSync(resolve(__dirname, '..', 'sample_configs', path), { encoding: 'utf-8' });
  return { name, content };
};

test('core generates correct files with one locale', () => {
  expect(
    generateCore({
      inputFiles: [getFile('simple/en.json')],
      outputToInputPath: '../sample_configs/simple',
      defaultLanguage: 'en',
    }),
  ).toMatchSnapshot();
});

test.each(['simple', 'large'])('core generates correct files: %s', (dir) => {
  expect(
    generateCore({
      inputFiles: [getFile(`${dir}/en.json`), getFile(`${dir}/fr.json`)],
      outputToInputPath: `../sample_configs/${dir}`,
      defaultLanguage: 'en',
    }),
  ).toMatchSnapshot();
});

test.each(['simple', 'large'])('core generates correct files with errOnUnusedParam: %s', (dir) => {
  expect(
    generateCore({
      inputFiles: [getFile(`${dir}/en.json`), getFile(`${dir}/fr.json`)],
      defaultLanguage: 'en',
      errOnUnusedParam: true,
      outputToInputPath: `../sample_configs/${dir}`,
    }),
  ).toMatchSnapshot();
});

test('can disable emitting .gitignore', () => {
  expect(
    generateCore({
      inputFiles: [getFile('simple/en.json')],
      outputToInputPath: '../sample_configs/simple',
      defaultLanguage: 'en',
      emitGitIgnore: false,
    }).map((f) => f.name),
  ).toMatchSnapshot();
});

test('can disable emitting utils', () => {
  expect(
    generateCore({
      inputFiles: [getFile('simple/en.json')],
      outputToInputPath: '../sample_configs/simple',
      defaultLanguage: 'en',
      emitUtils: false,
      emitBrowser: false,
    }).map((f) => f.name),
  ).toMatchSnapshot();
});

test('can disable emitting browser helper', () => {
  expect(
    generateCore({
      inputFiles: [getFile('simple/en.json')],
      outputToInputPath: '../sample_configs/simple',
      defaultLanguage: 'en',
      emitBrowser: false,
    }).map((f) => f.name),
  ).toMatchSnapshot();
});

test('can disable emitting source map', () => {
  expect(
    generateCore({
      inputFiles: [getFile('simple/en.json')],
      defaultLanguage: 'en',
      emitSourceMap: false,
    }).map((f) => f.name),
  ).toMatchSnapshot();
});
