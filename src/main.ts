import "./style.css";
import { compile } from "tailwindcss";
import tailwindcss from "./tailwind.css?raw";
import ClipboardJS from "clipboard";

const CLASS = /class="(.*?)"/g;
const TAILWIKICSS = /^\[\[module CSS tailwikicss\]\]$(.*?)^\[\[\/module\]\]$/ims;
const DIRECTIVES = /\/\*(.*?)\*\//s;
const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLTextAreaElement;
const onlyCSS = document.getElementById("only-css") as HTMLInputElement;
new ClipboardJS("#copy");

async function buildOne(source: string): Promise<string> {
  const directives = source.match(TAILWIKICSS)?.[1].match(DIRECTIVES);
  const inputCSS = directives?.[1] ?? '@import "theme";';

  const builder = compile(inputCSS, {
    async loadStylesheet(id, base) {
      const content = id.trim() === "theme" ? tailwindcss : "";
      return { path: id, base, content };
    },
  });

  const classes = new Set<string>();
  for (const match of source.matchAll(CLASS)) {
    for (const name of match[1].split(" ")) {
      if (name) classes.add(name);
    }
  }

  const outputCSS = builder
    .then((value) => value.build([...classes]))
    .catch((_) => "")
    .then((value) =>
      value
        .replaceAll(/\/\*.*?\*\//gs, "")
        .replaceAll(/\s+/g, " ")
        .replaceAll(/\s*([\{\}\+>~;:,!])\s*/g, "$1")
        .replaceAll(";}", "}")
        .replaceAll(":root,:host", ":root")
        .trim(),
    );

  if (onlyCSS.checked) return outputCSS;

  return outputCSS
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
  const out = contents.map(buildOne);
  output.value = (await Promise.all(out)).join("\n====\n");
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
