import "./style.css";
import { compile } from "tailwindcss";
import tailwind from "./tailwind.css?raw";
import ClipboardJS from "clipboard";

const CLASS = /class="(.*?)"/g;
const TAILWIKICSS = /^\[\[module CSS tailwikicss\]\]$(.*?)^\[\[\/module\]\]$/ims;
const DIRECTIVES = /\/\*(.*?)\*\//s;
const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLTextAreaElement;
const onlyCSS = document.getElementById("only-css") as HTMLInputElement;
new ClipboardJS("#copy");

async function buildOne(source: string): Promise<string> {
  let inputCSS = tailwind;

  const directives = source.match(TAILWIKICSS)?.[1].match(DIRECTIVES);
  if (directives) {
    inputCSS += directives[1];
  }

  const builder = compile(inputCSS);

  const classes = new Set<string>();
  for (const match of source.matchAll(CLASS)) {
    for (const name of match[1].split(" ")) {
      if (name) classes.add(name);
    }
  }

  const outputCSS = (await builder)
    .build([...classes])
    .replaceAll(/\/\*.*?\*\//gs, "")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/\s*([\{\}\+>~;:,])\s*/g, "$1")
    .replaceAll(";}", "}")
    .replaceAll(":root,:host", ":root")
    .trim();

  if (onlyCSS.checked) return outputCSS + "\n";

  const code = outputCSS
    ? `[[module CSS tailwikicss]]
${directives ? directives[0] + "\n" : ""}${outputCSS}
[[/module]]`
    : "";

  return TAILWIKICSS.test(source)
    ? source.replace(TAILWIKICSS, code)
    : code + (code ? "\n\n" : "") + source;
}

async function build(): Promise<void> {
  const contents = input.value.split("====\n");
  const out = contents.map(buildOne);
  output.value = (await Promise.all(out)).join("====\n");
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
