import { readdirSync, readFileSync, rmdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { generateFs } from '../src/fsGenerator';

test('generates correct files with two locales', () => {
  if (existsSync(resolve('test/generated'))) {
    rmdirSync(resolve('test/generated'), { recursive: true });
  }

  generateFs({
    inputDirectory: 'test/resources',
    outputDirectory: 'test/generated',
    defaultLanguage: 'en',
  });

  expect(readdirSync(resolve(__dirname, './generated/'))).toHaveLength(4);
  expect(readFileSync(resolve(__dirname, './generated/en.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/fr.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/types.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/index.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
});
