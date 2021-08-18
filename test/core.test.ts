import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateCore } from '../src/core';

const getFile = (path: string) => {
  const pathParts = path.split('/');
  const name = pathParts[pathParts.length - 1];
  const content = readFileSync(resolve(__dirname, 'resources', path), { encoding: 'utf-8' });
  return { name, content };
};

test('core generates correct files with one locale', () => {
  expect(
    generateCore({
      inputFiles: [getFile('simple/en.json')],
      outputToInputPath: './resources/simple',
      defaultLanguage: 'en',
    }),
  ).toMatchSnapshot();
});

test.each(['simple', 'large'])('core generates correct files: %s', (dir) => {
  expect(
    generateCore({
      inputFiles: [getFile(`${dir}/en.json`), getFile(`${dir}/fr.json`)],
      outputToInputPath: `./resources/${dir}`,
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
      outputToInputPath: `./resources/${dir}`,
    }),
  ).toMatchSnapshot();
});

test('can disable emitting .gitignore', () => {
  expect(
    generateCore({
      inputFiles: [getFile('simple/en.json')],
      outputToInputPath: './resources/simple',
      defaultLanguage: 'en',
      emitGitIgnore: false,
    }).map((f) => f.name),
  ).toMatchSnapshot();
});

test('can disable emitting utils', () => {
  expect(
    generateCore({
      inputFiles: [getFile('simple/en.json')],
      outputToInputPath: './resources/simple',
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
      outputToInputPath: './resources/simple',
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
