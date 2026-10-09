import "./style.css";
import { compileAst } from "tailwindcss";
import tailwindcss from "./tailwind.css?raw";
import ClipboardJS from "clipboard";
import { atRule, parse, toCSS } from "./ast";

const CLASS = /class="(.*?)"/g;
const TAILWIKICSS = /^\[\[module CSS tailwikicss\]\]$(.*?)^\[\[\/module\]\]$/ims;
const DIRECTIVES = /\/\*(.*?)\*\//s;
const tailwindcssTheme = parse(tailwindcss);
const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLTextAreaElement;
const minifyCSS = document.getElementById("minify-css") as HTMLInputElement;
const onlyCSS = document.getElementById("only-css") as HTMLInputElement;
new ClipboardJS("#copy");

async function buildOne(source: string): Promise<string> {
  const directives = source.match(TAILWIKICSS)?.[1].match(DIRECTIVES);

  const builder = compileAst([
    ...parse(directives?.[1] ?? ""),
    ...tailwindcssTheme,
    atRule("@tailwind", "utilities", []),
  ]);

  const classes = new Set<string>();
  for (const match of source.matchAll(CLASS)) {
    for (const name of match[1].split(" ")) {
      if (name) classes.add(name);
    }
  }

  let css = builder.then((value) => toCSS(value.build([...classes])));

  if (minifyCSS.checked) {
    css = css.then((value) =>
      value
        .replaceAll(/\/\*.*?\*\//gs, "")
        .replaceAll(/\s+/g, " ")
        .replaceAll(/\s*([{}+>~;:,])\s*/g, "$1")
        .replaceAll(";}", "}")
        .replaceAll(":root,:host", ":root"),
    );
  }

  css = css.then((value) => value.trim());

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
  output.value = compiled.join("\n====\n");
}

let timer: ReturnType<typeof setTimeout> | undefined;

function buildDebounced(): void {
  clearTimeout(timer);
  timer = setTimeout(build, 100);
}

input.addEventListener("input", () => {
  localStorage.setItem("source", input.value);
  buildDebounced();
});

minifyCSS.addEventListener("click", build);
onlyCSS.addEventListener("click", build);

const source = localStorage.getItem("source");
if (source !== null) {
  input.value = source;
  build();
}
