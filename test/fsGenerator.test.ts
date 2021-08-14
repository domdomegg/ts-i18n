import { readdirSync, readFileSync, rmdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { generateFs } from '../src/fsGenerator';

test.each(['simple', 'large'])('fsGenerator generates correct files: %s', (dir) => {
  if (existsSync(resolve('test/generated'))) {
    rmdirSync(resolve('test/generated'), { recursive: true });
  }

  generateFs({
    inputDirectory: `test/resources/${dir}`,
    outputDirectory: 'test/generated',
    defaultLanguage: 'en',
  });

  expect(readdirSync(resolve(__dirname, './generated/'))).toHaveLength(6);
  expect(readFileSync(resolve(__dirname, './generated/en.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/fr.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/types.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/utils.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/browser.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
});
