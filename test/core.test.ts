import { readFileSync } from 'fs';
import { resolve } from 'path';
import { generateCore } from '../src/core';

test('core generates correct files with one locale', () => {
  expect(
    generateCore({
      inputFiles: [
        {
          name: 'en.json',
          content: readFileSync(resolve(__dirname, 'resources/simple/en.json'), { encoding: 'utf-8' }),
        },
      ],
      defaultLanguage: 'en',
    }),
  ).toMatchSnapshot();
});

test.each(['simple', 'large'])('core generates correct files: %s', (dir) => {
  expect(
    generateCore({
      inputFiles: [
        {
          name: 'en.json',
          content: readFileSync(resolve(__dirname, 'resources', dir, 'en.json'), { encoding: 'utf-8' }),
        },
        {
          name: 'fr.json',
          content: readFileSync(resolve(__dirname, 'resources', dir, 'fr.json'), { encoding: 'utf-8' }),
        },
      ],
      defaultLanguage: 'en',
    }),
  ).toMatchSnapshot();
});
