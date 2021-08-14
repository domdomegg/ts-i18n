# ts-i18n

Lightweight i18n with proper TypeScript support

Turns JSON translation files:

```json
// en.json
{
  "thereAreXFeatures": "There is {{count}} feature",
  "thereAreXFeatures_plural": "There are {{count}} features",
  "nested": {
    "works": "Nested works"
  },
  "andYouCanMissKeys": "And you can miss keys in non-default languages",
  "orHaveDifferentPlaceholders": "Or have different placeholders, {{firstName}}"
}

// fr.json
{
  "thereAreXFeatures": "Il y a {{count}} fonctionnalité",
  "thereAreXFeatures_plural": "Il y a {{count}} fonctionnalités",
  "nested": {
    "works": "Imbriqué fonctionne"
  },
  "orHaveDifferentPlaceholders": "Ou avoir des espaces réservés différents, {{username}}"
}
```

into TypeScript:

```ts
// types.ts
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]; }
export interface Language {
  thereAreXFeatures: (p: { count: number }) => string,
  nested: {
    works: () => string,
  },
  andYouCanMissKeys: () => string,
  orHaveDifferentPlaceholders: (p: { firstName: string | number, username: string | number }) => string,
}

// en.ts
import { Language } from "./types"
const lang = {
  thereAreXFeatures: (p: { count: number }): string => p.count === 1 ? ("There is " + p.count.toString() + " feature") : lang.thereAreXFeatures_plural(p),
  thereAreXFeatures_plural: (p: { count: string | number }): string => "There are " + p.count.toString() + " features",
  nested: {
    works: (): string => "Nested works",
  },
  andYouCanMissKeys: (): string => "And you can miss keys in non-default languages",
  orHaveDifferentPlaceholders: (p: { firstName: string | number }): string => "Or have different placeholders, " + p.firstName.toString() + "",
}
export default lang as Language

// fr.ts
import { Language, DeepPartial } from "./types"
const lang = {
  thereAreXFeatures: (p: { count: number }): string => p.count === 1 ? ("Il y a " + p.count.toString() + " fonctionnalité") : lang.thereAreXFeatures_plural(p),
  thereAreXFeatures_plural: (p: { count: string | number }): string => "Il y a " + p.count.toString() + " fonctionnalités",
  nested: {
    works: (): string => "Imbriqué fonctionne",
  },
  orHaveDifferentPlaceholders: (p: { username: string | number }): string => "Ou avoir des espaces réservés différents, " + p.username.toString() + "",
}
export default lang as DeepPartial<Language>
```

## Installation

### Globally, as a CLI tool

Install ts-i18n globally, then use it from the CLI

```
npm i -g ts-i18n
ts-i18n -i i18n/src -o i18n/generated
```

Where `i18n/src` is the path to a directory with JSON translation files, and `i18n/generated` is the path the output directory.

### In your package.json

Add ts-i18n as a dev dependency:

```
npm i -D ts-i18n
```

Then, in your package.json call it:

```jsonc
{
  "scripts": {
    "prebuild": "ts-i18n -i i18n/src -o i18n/generated",
  }
  ...
}
```

Where `i18n/src` is the path to a directory with JSON translation files, and `i18n/generated` is the path the output directory.

## Motivation

Most i18n libraries are not nice to use in TypeScript. Many don't check even that the translation strings exist, let alone that you are passing the right arguments. The ones that do are often too restrictive in their types between languages, are inefficient for front-end workflows or bundle stuff you don't need.

Having proper TypeScript support improves the developer experience, as your IDE can suggest i18n strings and warns you on non-existing ones. Renaming strings is much easier as you can quickly see all the errors in your codebase. Libraries without TypeScript support make you check you are using the right string, and if you get it wrong you'll just have a runtime error which might be missed.

### Comparison to alternatives

These libraries have been selected as I think they're good or popular enough to consider. These are only my opinions, and I mean no disrespect to their authors and I'm sure for their intended use cases there was good reason for their design. If I've misrepresented or misunderstood a library I'd be happy to be corrected in a PR :)

- i18next, jQuery.i18n, @owja/i18n: These libraries do not provide TypeScript support for translation keys
- gen-i18n-ts: One of the best alternatives. However, it doesn't support plurals and uses positional rather than named arguments.
- typesafe-i18n: Another great alternative. However, it doesn't allow you to fallback in non-default languages. This is a dealbreaker for many open-source projects where a contributor might not be willing to provide all translation strings for a new language at once. It also doesn't allow you to have different placeholders in different languages.
- FormatJS + @formatjs/ts-transformer: Limited documentation. Also, FormatJS is very powerful but can sometimes be very clunky to use and set up. I'm not certain this provides TypeScript support for translation keys.
- typed-locale-keys: Limtited documentation. Doesn't supported nested JSON. Doesn't support multiple locales at once. Requires another i18n library for substitutions and plurals.
- i18n-ts: Doesn't support specifying translation strings in JSON (need to write manually in TypeScript, which is not always translator or translation-platform friendly). Requires specifying translation strings and substitutions manually. Does not support missing keys in non-default languages. Does not support different arguments in different languages.
