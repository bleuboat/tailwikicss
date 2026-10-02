import "./style.css";
import { compileAst } from "tailwindcss";
import tailwindcss from "./tailwind.css?raw";
import ClipboardJS from "clipboard";
import { atRule, parse, toCSS } from "./ast";

const CLASS = /class="(.*?)"/g;
const TAILWIKICSS = /^\[\[module CSS tailwikicss\]\]$(.*?)^\[\[\/module\]\]$/ims;
const DIRECTIVES = /\/\*(.*?)\*\//s;
const tailwindcssTheme = parse(tailwindcss)[0];
const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLTextAreaElement;
const onlyCSS = document.getElementById("only-css") as HTMLInputElement;
new ClipboardJS("#copy");

async function buildOne(source: string): Promise<string> {
  const tailwindcssAst = [tailwindcssTheme, atRule("@tailwind", "utilities", [])];

  const directives = source.match(TAILWIKICSS)?.[1]?.match(DIRECTIVES);

  const builder = compileAst(parse(directives?.[1] ?? "").concat(tailwindcssAst));

  const classes = new Set<string>();
  for (const match of source.matchAll(CLASS)) {
    for (const name of match[1].split(" ")) {
      if (name) classes.add(name);
    }
  }

  const css = builder.then((value) => toCSS(value.build([...classes])).replaceAll(/\s+/g, " "));

  if (onlyCSS.checked) return css;

  return css
    .then((value) =>
      directives || value
        ? `[[module CSS tailwikicss]]
${directives ? directives[0] + (value ? "\n" : "") : ""}${value}
[[/module]]`
        : "",
    )
    .then((value) =>
      TAILWIKICSS.test(source)
        ? source.replace(TAILWIKICSS, value)
        : value + (value ? "\n\n" : "") + source,
    );
}

async function build(): Promise<void> {
  const contents = input.value.split("\n====\n");
  const compiled = await Promise.all(contents.map(buildOne)).catch((e: Error) => [
    `Error: ${e.message}`,
  ]);
  console.log(compiled.map(value => value.length).reduce((x, y) => x + y))
  output.value = compiled.join("\n====\n");
}

input.addEventListener("input", async () => {
  localStorage.setItem("source", input.value);
  build();
});

onlyCSS.addEventListener("click", build);

const source = localStorage.getItem("source");
if (source) {
  input.value = source;
  build();
}
