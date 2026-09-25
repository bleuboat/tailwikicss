import { compile } from ".";

const CLASS = /class="(.*?)"/g;
const TAILWIKICSS = /^\[\[module CSS tailwikicss\]\]$.*?^\[\[\/module\]\]$/ims;
const input = document.getElementById("input") as HTMLTextAreaElement;
const output = document.getElementById("output") as HTMLTextAreaElement;

async function build(source: string): Promise<string> {
  const classes = new Set<string>();
  for (const match of source.matchAll(CLASS)) {
    for (const name of match[1].split(" ")) {
      if (name) classes.add(name);
    }
  }
  const css = (await compile("@tailwind utilities;")).build([...classes]);
  const code = css
    ? `[[module CSS tailwikicss]]
${css}
[[/module]]`
    : "";
  if (TAILWIKICSS.test(source)) return source.replace(TAILWIKICSS, code);
  return code + (code ? "\n\n" : "") + source;
}

input.addEventListener("input", async () => {
  const source = input.value;
  localStorage.setItem("source", source);
  output.value = await build(source);
});

const source = localStorage.getItem("source");
if (source) {
  input.value = source;
  output.value = await build(source);
}
