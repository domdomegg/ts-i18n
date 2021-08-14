import { readFileSync } from "fs";
import { resolve } from "path";
import { generateCore } from "../src/core";

test("generates correct files with one locale", () => {
  expect(
    generateCore({
      inputFiles: [
        {
          name: "en.json",
          content: readFileSync(resolve(__dirname, "./resources/en.json"), {
            encoding: "utf-8",
          }),
        },
      ],
      defaultLanguage: "en",
    })
  ).toMatchSnapshot();
});

test("generates correct files with two locales", () => {
  expect(
    generateCore({
      inputFiles: [
        {
          name: "en.json",
          content: readFileSync(resolve(__dirname, "./resources/en.json"), {
            encoding: "utf-8",
          }),
        },
        {
          name: "fr.json",
          content: readFileSync(resolve(__dirname, "./resources/fr.json"), {
            encoding: "utf-8",
          }),
        },
      ],
      defaultLanguage: "en",
    })
  ).toMatchSnapshot();
});
