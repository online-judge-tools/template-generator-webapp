declare const hljs: any;

interface Problem {
  url: string;
  title: string;
  template: { [name: string]: string };
}

function loadPrecomputedData(): Problem[] {
  const url = "data.json";
  const req = new XMLHttpRequest();
  req.open("GET", url, false);
  req.send();
  if (req.status !== 200) {
    throw new Error(req.statusText);
  }
  return JSON.parse(req.responseText);
}

let cache = null;

function loadPrecomputedDataWithCache(): Problem[] {
  if (cache === null) {
    cache = loadPrecomputedData();
  }
  return cache;
}

function readProblemUrl(): string {
  const defaultUrl = "https://atcoder.jp/contests/agc006/tasks/agc006_c";
  const input = document.getElementById("urlInput") as HTMLInputElement;
  return input.value ? input.value : defaultUrl;
}

function writeProblemName(name: string): void {
  const input = document.getElementById("nameInput") as HTMLInputElement;
  input.value = name;
}

function writeGeneratedCode(result: string, lang: string) {
  const code = document.createElement("code");
  code.innerText = result;
  code.classList.add("language-" + lang);
  hljs.highlightBlock(code);

  const pre = document.createElement("pre");
  pre.appendChild(code);

  const container = document.getElementById(
    "codeContainer"
  ) as HTMLInputElement;
  while (container.firstChild) {
    container.removeChild(container.lastChild);
  }
  container.appendChild(pre);
}

function isEquivalentUrl(s1: string, s2: string): boolean {
  const url1 = new URL(s1);
  const url2 = new URL(s2);
  const pathname1 = url1.pathname.replace("//", "/").replace(/\/$/, "");
  const pathname2 = url2.pathname.replace("//", "/").replace(/\/$/, "");
  return url1.host === url2.host && pathname1 === pathname2;
}

function lookupProblemFromUrl(url: string, data: Problem[]): Problem | null {
  try {
    new URL(url);
  } catch (err) {
    return null;
  }
  for (const problem of data) {
    if (isEquivalentUrl(url, problem.url)) {
      return problem;
    }
  }
  return null;
}

function getLanguageFromTemplate(template: string): string {
  if (template === "main.cpp") return "cpp";
  if (template === "main.py") return "python";
  if (template === "generate.cpp") return "cpp";
  if (template === "generate.py") return "python";
  return "plaintext";
}

function update(): void {
  const data = loadPrecomputedDataWithCache();
  const url = readProblemUrl();

  const problem = lookupProblemFromUrl(url, data);
  try {
    new URL(url);
  } catch (err) {
    writeProblemName("error");
    writeGeneratedCode("not a URL: " + JSON.stringify(url) + "\n", "plaintext");
  }
  if (problem === null) {
    writeProblemName("error");
    let message =
      "Please use the command-line version instead: https://github.com/online-judge-tools/template-generator";
    if (
      !url.match(/\batcoder\b/) &&
      !url.match(/\bcodeforces\b/) &&
      !url.match(/\byosupo\b/)
    ) {
      message =
        "Currently this web-interface only supports problems of AtCoder (atcoder.jp), Codeforces (codeforces.com), and Library-Checker (judge.yosupo.jp).\n" +
        message;
    }
    writeGeneratedCode(
      "unsupported URL: " + JSON.stringify(url) + "\n\n" + message,
      "plaintext"
    );
    return;
  }
  writeProblemName(problem.title);

  const select = document.getElementById("templateSelect") as HTMLInputElement;
  const template = select.value;
  if (!(template in problem["template"])) {
    writeGeneratedCode(
      "failed to geneate the template: " + template,
      "plaintext"
    );
    return;
  }
  const result = problem.template[template];
  const lang = getLanguageFromTemplate(template);
  writeGeneratedCode(result, lang);
}

document.addEventListener("DOMContentLoaded", (event) => {
  const form = document.getElementById("generateForm");
  form.addEventListener("submit", update);

  const select = document.getElementById("templateSelect");
  select.addEventListener("change", update);

  update();
});
