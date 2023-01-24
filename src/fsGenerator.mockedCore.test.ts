import { generateFs } from './fsGenerator';
import { generateCore } from './core';

jest.mock('../src/core');
beforeEach(() => (generateCore as jest.Mock).mockReset().mockReturnValue([]));

test('can disable emitting .gitignore', () => {
  generateFs({
    inputDirectory: 'sample_configs/simple',
    outputDirectory: 'sample_configs/generated',
    emitGitIgnore: false,
  });

  expect(generateCore).toHaveBeenCalledTimes(1);
  expect((generateCore as jest.Mock).mock.calls[0][0].emitGitIgnore).toBe(false);
});

test('can disable emitting utils', () => {
  generateFs({
    inputDirectory: 'sample_configs/simple',
    outputDirectory: 'sample_configs/generated',
    emitUtils: false,
    emitBrowser: false,
  });

  expect(generateCore).toHaveBeenCalledTimes(1);
  expect((generateCore as jest.Mock).mock.calls[0][0].emitUtils).toBe(false);
});

test('can disable emitting browser helper', () => {
  generateFs({
    inputDirectory: 'sample_configs/simple',
    outputDirectory: 'sample_configs/generated',
    emitBrowser: false,
  });

  expect(generateCore).toHaveBeenCalledTimes(1);
  expect((generateCore as jest.Mock).mock.calls[0][0].emitBrowser).toBe(false);
});
