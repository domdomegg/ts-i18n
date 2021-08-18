import { readdirSync, readFileSync, rmdirSync, existsSync } from 'fs';
import { resolve } from 'path';
import { generateFs } from '../src/fsGenerator';

beforeEach(() => {
  // Using existsSync and rmdirSync instead of rmSync to support Node 12
  if (existsSync(resolve('test/generated'))) {
    rmdirSync(resolve('test/generated'), { recursive: true });
  }
});

test.each(['simple', 'large'])('fsGenerator generates correct files: %s', (dir) => {
  generateFs({
    inputDirectory: `test/resources/${dir}`,
    outputDirectory: 'test/generated',
  });

  expect(readdirSync(resolve(__dirname, './generated/'))).toHaveLength(7);
  expect(readFileSync(resolve(__dirname, './generated/en.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/fr.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/types.d.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/utils.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/browser.ts'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/.gitignore'), { encoding: 'utf-8' })).toMatchSnapshot();
  expect(readFileSync(resolve(__dirname, './generated/types.d.ts.map'), { encoding: 'utf-8' })).toMatchSnapshot();
});
