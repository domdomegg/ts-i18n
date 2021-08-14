import { generateFs } from '../src/fsGenerator';
import { generateCore } from '../src/core';

jest.mock('../src/core');
beforeEach(() => (generateCore as jest.Mock).mockReset().mockReturnValue([]));

test('can disable emitting .gitignore', () => {
  generateFs({
    inputDirectory: 'test/resources/simple',
    outputDirectory: 'test/generated',
    emitGitIgnore: false,
  });

  expect(generateCore).toHaveBeenCalledTimes(1);
  expect((generateCore as jest.Mock).mock.calls[0][0].emitGitIgnore).toBe(false);
});

test('can disable emitting utils', () => {
  generateFs({
    inputDirectory: 'test/resources/simple',
    outputDirectory: 'test/generated',
    emitUtils: false,
    emitBrowser: false,
  });

  expect(generateCore).toHaveBeenCalledTimes(1);
  expect((generateCore as jest.Mock).mock.calls[0][0].emitUtils).toBe(false);
});

test('can disable emitting browser helper', () => {
  generateFs({
    inputDirectory: 'test/resources/simple',
    outputDirectory: 'test/generated',
    emitBrowser: false,
  });

  expect(generateCore).toHaveBeenCalledTimes(1);
  expect((generateCore as jest.Mock).mock.calls[0][0].emitBrowser).toBe(false);
});
