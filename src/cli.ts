#!/usr/bin/env node

import { generateFs } from "./fsGenerator";
import { program } from "commander";

const cli = (args: string[]) => {
  program
    .description("i18n with proper TypeScript support")
    .requiredOption(
      "-i, --input <folder>",
      "Input folder for your input JSON files"
    )
    .requiredOption(
      "-o, --output <folder>",
      "Output folder for your generated .ts files"
    )
    .requiredOption(
      "-d, --default-language <lang>",
      "The default/fallback/primary language",
      "en"
    )
    .parse(args);

  generateFs({
    inputDirectory: program.opts().input,
    outputDirectory: program.opts().output,
    defaultLanguage: program.opts().defaultLanguage,
  });
};

try {
  cli(process.argv);
} catch (e) {
  // A bold red 'Error: '
  const errorPrefix = "\x1b[1;31mError:\x1b[0m ";

  const helpHint = "\x1b[1mHint:\x1b[0m View help with --help";

  if (e instanceof Error) {
    console.error(errorPrefix + e.message);
    console.error(helpHint);
    process.exit(1);
  } else {
    console.error(errorPrefix + e);
    console.error(helpHint);
    process.exit(2);
  }
}
