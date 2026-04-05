// =====================
// DOM Elements
// =====================
const form = document.getElementById("generate-form");
const promptEl = document.getElementById("prompt");
const charCountEl = document.getElementById("char-count");
const generateBtn = document.getElementById("generate-btn");
const btnText = generateBtn.querySelector(".btn-text");

const inputSection = document.querySelector(".input-section");
const outputSection = document.getElementById("output-section");
const loadingSection = document.getElementById("loading-section");
const errorSection = document.getElementById("error-section");
const outputContent = document.getElementById("output-content");
const errorMessage = document.getElementById("error-message");

const copyBtn = document.getElementById("copy-btn");
const downloadBtn = document.getElementById("download-btn");
const newBtn = document.getElementById("new-btn");
const retryBtn = document.getElementById("retry-btn");

// =====================
// State
// =====================
let rawMarkdown = "";
let isStreaming = false;
let currentEventSource = null;

// =====================
// Character Counter
// =====================
promptEl.addEventListener("input", () => {
  const len = promptEl.value.length;
  charCountEl.textContent = len;
  const parent = charCountEl.closest(".char-count");
  parent.classList.toggle("warning", len > 1800);
});

// =====================
// Markdown Renderer
// =====================
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // H2
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  // H3
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // Inline code
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>[\s\S]+?<\/li>)(\n(?!<li>)|$)/g, "<ul>$1</ul>\n");

  // Paragraphs (blank-line-separated)
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (/^<(h[23]|ul|hr|blockquote)/.test(block)) return block;
      // Wrap loose text in <p>
      block = block.replace(/\n/g, "<br>");
      return `<p>${block}</p>`;
    })
    .filter(Boolean)
    .join("\n");

  return html;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// =====================
// Show / Hide Sections
// =====================
function showLoading() {
  loadingSection.classList.remove("hidden");
  outputSection.classList.add("hidden");
  errorSection.classList.add("hidden");
}

function showOutput() {
  loadingSection.classList.add("hidden");
  outputSection.classList.remove("hidden");
  errorSection.classList.add("hidden");
}

function showError(msg) {
  loadingSection.classList.add("hidden");
  outputSection.classList.add("hidden");
  errorSection.classList.remove("hidden");
  errorMessage.textContent = msg;
}

function resetToForm() {
  loadingSection.classList.add("hidden");
  outputSection.classList.add("hidden");
  errorSection.classList.add("hidden");
  generateBtn.disabled = false;
  btnText.textContent = "Generate Script";
  isStreaming = false;
  rawMarkdown = "";
}

// =====================
// Generation
// =====================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = promptEl.value.trim();
  if (!prompt) return;

  const style = document.getElementById("style").value;
  const duration = document.getElementById("duration").value;

  generateBtn.disabled = true;
  btnText.textContent = "Generating...";
  rawMarkdown = "";
  outputContent.innerHTML = "";
  isStreaming = true;

  showLoading();

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, style, duration }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `Server error ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let firstChunk = true;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        if (parsed.error) {
          showError(parsed.error);
          generateBtn.disabled = false;
          btnText.textContent = "Generate Script";
          isStreaming = false;
          return;
        }

        if (parsed.done) {
          // Remove cursor, final render
          isStreaming = false;
          outputContent.innerHTML = renderMarkdown(rawMarkdown);
          generateBtn.disabled = false;
          btnText.textContent = "Generate Script";
          break;
        }

        if (parsed.text) {
          if (firstChunk) {
            showOutput();
            firstChunk = false;
          }
          rawMarkdown += parsed.text;
          // Live render with streaming cursor
          outputContent.innerHTML =
            renderMarkdown(rawMarkdown) +
            '<span class="streaming-cursor"></span>';
          // Auto-scroll to bottom during streaming
          outputContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }
  } catch (err) {
    showError(
      err.message || "Failed to connect to the server. Is it running?"
    );
    generateBtn.disabled = false;
    btnText.textContent = "Generate Script";
    isStreaming = false;
  }
});

// =====================
// Copy Button
// =====================
copyBtn.addEventListener("click", async () => {
  if (!rawMarkdown) return;
  try {
    await navigator.clipboard.writeText(rawMarkdown);
    const orig = copyBtn.innerHTML;
    copyBtn.innerHTML = "<span>✅</span> Copied!";
    setTimeout(() => { copyBtn.innerHTML = orig; }, 2000);
  } catch {
    copyBtn.innerHTML = "<span>❌</span> Failed";
    setTimeout(() => { copyBtn.innerHTML = "<span>📋</span> Copy"; }, 2000);
  }
});

// =====================
// Download Button
// =====================
downloadBtn.addEventListener("click", () => {
  if (!rawMarkdown) return;
  const blob = new Blob([rawMarkdown], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const title = rawMarkdown.match(/## (.+)/)?.[1] || "video-script";
  const fileName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50) + ".md";
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

// =====================
// New Script Button
// =====================
newBtn.addEventListener("click", () => {
  resetToForm();
  promptEl.focus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// =====================
// Retry Button
// =====================
retryBtn.addEventListener("click", () => {
  resetToForm();
  form.dispatchEvent(new Event("submit"));
});
