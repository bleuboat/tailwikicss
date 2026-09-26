import "./style.css";
import { compile } from "tailwindcss";
import tailwind from "./tailwind.css?raw";
import ClipboardJS from "clipboard";

const CLASS = /class="(.*?)"/g;
const TAILWIKICSS = /^\[\[module CSS tailwikicss\]\]$.*?^\[\[\/module\]\]$/ims;
const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLTextAreaElement;
const onlyCSS = document.getElementById("only-css") as HTMLInputElement;
new ClipboardJS("#copy");

async function build(): Promise<void> {
  const source = input.value;
  const builder = compile(tailwind);

  const classes = new Set<string>();
  for (const match of source.matchAll(CLASS)) {
    for (const name of match[1].split(" ")) {
      if (name) classes.add(name);
    }
  }

  const css = (await builder)
    .build([...classes])
    .replaceAll(/\/\*.*?\*\//gs, "")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/\s*([\{\}\+>~;:,])\s*/g, "$1")
    .replaceAll(";}", "}")
    .replaceAll(":root,:host", ":root")
    .trim();

  if (onlyCSS.checked) {
    output.value = css;
    return;
  }

  const code = css
    ? `[[module CSS tailwikicss]]
${css}
[[/module]]`
    : "";

  output.value = TAILWIKICSS.test(source)
    ? source.replace(TAILWIKICSS, code)
    : code + (code ? "\n\n" : "") + source;
}

input.addEventListener("input", async () => {
  localStorage.setItem("source", input.value);
  build();
});

onlyCSS.addEventListener("click", build)

const source = localStorage.getItem("source");
if (source) {
  input.value = source;
  build();
}
