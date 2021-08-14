import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { generateCore, Files } from './core';

export const generateFs = (options: {
  inputDirectory: string;
  outputDirectory: string;
  defaultLanguage: string;
}): void => {
  const languageFiles = getLanguageFiles(options.inputDirectory);
  if (!languageFiles.length) throw new Error(`No language files found in ${options.inputDirectory}`);
  const code = generateCore({
    inputFiles: languageFiles,
    defaultLanguage: options.defaultLanguage,
  });
  writeToDirectory(options.outputDirectory, code);
};

const getLanguageFiles = (directory: string): Files => readdirSync(resolve(directory))
  .filter((f) => f.endsWith('.json'))
  .map((f) => ({
    name: f,
    content: readFileSync(resolve(directory, f), { encoding: 'utf-8' }),
  }));

const writeToDirectory = (directory: string, files: Files): void => {
  mkdirSync(resolve(directory), { recursive: true });
  files.forEach((file) => {
    const path = resolve(directory, file.name);
    if (existsSync(path) && readFileSync(path, { encoding: 'utf-8' }) === file.content) {
      // Don't write if no changes
      return;
    }
    writeFileSync(path, file.content, { encoding: 'utf-8' });
  });
};
