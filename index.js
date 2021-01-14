function loadPrecomputedData() {
    var url = "data.json";
    var req = new XMLHttpRequest();
    req.open("GET", url, false);
    req.send();
    if (req.status !== 200) {
        throw new Error(req.statusText);
    }
    return JSON.parse(req.responseText);
}
var cache = null;
function loadPrecomputedDataWithCache() {
    if (cache === null) {
        cache = loadPrecomputedData();
    }
    return cache;
}
function readProblemUrl() {
    var defaultUrl = "https://atcoder.jp/contests/agc006/tasks/agc006_c";
    var input = document.getElementById("urlInput");
    return input.value ? input.value : defaultUrl;
}
function writeProblemName(name) {
    var input = document.getElementById("nameInput");
    if (name === null) {
        input.value = "error";
    }
    else {
        input.value = name;
    }
}
function writeProblemUrl(url) {
    var anchor = document.getElementById("nameAnchor");
    anchor.href = url;
}
function writeGeneratedCode(result, lang) {
    var code = document.createElement("code");
    code.textContent = result;
    code.classList.add("language-" + lang);
    hljs.highlightBlock(code);
    var pre = document.createElement("pre");
    pre.appendChild(code);
    var container = document.getElementById("codeContainer");
    while (container.firstChild) {
        container.removeChild(container.lastChild);
    }
    container.appendChild(pre);
}
function isEquivalentUrl(s1, s2) {
    var url1 = new URL(s1);
    var url2 = new URL(s2);
    var pathname1 = url1.pathname.replace("//", "/").replace(/\/$/, "");
    var pathname2 = url2.pathname.replace("//", "/").replace(/\/$/, "");
    return url1.host === url2.host && pathname1 === pathname2;
}
function lookupProblemFromUrl(url, data) {
    try {
        new URL(url);
    }
    catch (err) {
        return null;
    }
    for (var _i = 0, data_1 = data; _i < data_1.length; _i++) {
        var problem = data_1[_i];
        if (isEquivalentUrl(url, problem.url)) {
            return problem;
        }
    }
    return null;
}
function getLanguageFromTemplate(template) {
    if (template === "main.cpp")
        return "cpp";
    if (template === "main.py")
        return "python";
    if (template === "generate.cpp")
        return "cpp";
    if (template === "generate.py")
        return "python";
    return "plaintext";
}
function update() {
    var data = loadPrecomputedDataWithCache();
    var url = readProblemUrl();
    try {
        new URL(url);
    }
    catch (err) {
        writeProblemName(null);
        writeGeneratedCode("not a URL: " + JSON.stringify(url) + "\n", "plaintext");
        return;
    }
    writeProblemUrl(url);
    var problem = lookupProblemFromUrl(url, data);
    if (problem === null) {
        writeProblemName(null);
        var message = "Please use the command-line version instead: https://github.com/online-judge-tools/template-generator";
        if (url.match(/\batcoder\b/) ||
            url.match(/\bcodeforces\b/) ||
            url.match(/\byosupo\b/)) {
            message =
                "Probably the data for your problem is not pre-computed yet. This web-interface only supports old problems.\n" +
                    message;
        }
        else {
            message =
                "Currently this web-interface only supports problems of AtCoder (atcoder.jp), Codeforces (codeforces.com), and Library-Checker (judge.yosupo.jp).\n" +
                    message;
        }
        writeGeneratedCode("unsupported URL: " + JSON.stringify(url) + "\n\n" + message, "plaintext");
        return;
    }
    writeProblemName(problem.title);
    var select = document.getElementById("templateSelect");
    var template = select.value;
    if (!(template in problem["template"])) {
        writeGeneratedCode("failed to geneate the template: " + template, "plaintext");
        return;
    }
    var result = problem.template[template];
    var lang = getLanguageFromTemplate(template);
    writeGeneratedCode(result, lang);
}
document.addEventListener("DOMContentLoaded", function (event) {
    var form = document.getElementById("generateForm");
    form.addEventListener("submit", update);
    var select = document.getElementById("templateSelect");
    select.addEventListener("change", update);
});
