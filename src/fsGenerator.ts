import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { generateCore, Files } from "./core";

export const generateFs = (options: {
  inputDirectory: string;
  outputDirectory: string;
  defaultLanguage: string;
}): void => {
  createDirectory(options.outputDirectory);
  const languageFiles = getLanguageFiles(options.inputDirectory);
  if (!languageFiles.length)
    throw new Error("No language files found in " + options.inputDirectory);
  const code = generateCore({
    inputFiles: languageFiles,
    defaultLanguage: options.defaultLanguage,
  });
  writeToDirectory(options.outputDirectory, code);
};

const createDirectory = (directory: string): void => {
  mkdirSync(resolve(directory), { recursive: true });
};

const getLanguageFiles = (directory: string): Files => {
  return readdirSync(resolve(directory))
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      name: f,
      content: readFileSync(resolve(directory, f), { encoding: "utf-8" }),
    }));
};

const writeToDirectory = (directory: string, files: Files): void => {
  for (const file of files) {
    writeFileSync(resolve(directory, file.name), file.content, {
      encoding: "utf-8",
    });
  }
};
