/**
 * fdxUtils.js — Final Draft .fdx Import / Export
 * Supports FDX v1 and v2 (Final Draft 9–12)
 * Usage:
 *   import { parseFDX, exportFDX } from "../utils/fdxUtils";
 *   const elements = parseFDX(xmlString);
 *   const fdxString = exportFDX(title, elements);
 */

// ── ELEMENT TYPE MAP: FDX → SPX ──────────────────────────────────────────
const FDX_TO_SPX = {
  "Scene Heading":    "heading",
  "Action":           "action",
  "Character":        "character",
  "Dialogue":         "dialogue",
  "Parenthetical":    "paren",
  "Transition":       "transition",
  "Shot":             "heading",
  "General":          "action",
  "Cast List":        "note",
  "Note":             "note",
};

const SPX_TO_FDX = {
  heading:    "Scene Heading",
  action:     "Action",
  character:  "Character",
  dialogue:   "Dialogue",
  paren:      "Parenthetical",
  transition: "Transition",
  note:       "General",
};

// ── PARSE FDX → SPX elements array ────────────────────────────────────────
export function parseFDX(xmlString) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "application/xml");

  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error("Invalid FDX file: " + parseError.textContent);

  const paragraphs = doc.querySelectorAll("Paragraph");
  const elements = [];
  let id = 1;

  paragraphs.forEach((para) => {
    const fdxType = para.getAttribute("Type") || "Action";
    const spxType = FDX_TO_SPX[fdxType] || "action";

    // Collect all text nodes inside <Text> children
    const textNodes = para.querySelectorAll("Text");
    let text = "";
    textNodes.forEach((t) => {
      text += t.textContent;
    });

    // Fallback: direct text content
    if (!text) text = para.textContent;

    text = text.trim();
    if (!text) return;

    elements.push({ id: id++, type: spxType, text });
  });

  // Extract title from FDX TitlePage if present
  let title = "IMPORTED SCRIPT";
  const titleEl = doc.querySelector("TitlePage Content Paragraph Text");
  if (titleEl) title = titleEl.textContent.trim().toUpperCase();

  return { title, elements };
}

// ── EXPORT SPX elements → FDX string ──────────────────────────────────────
export function exportFDX(title = "UNTITLED", elements = []) {
  const escapeXml = (str) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

  const now = new Date().toISOString();

  const paragraphsXml = elements
    .map((el) => {
      const fdxType = SPX_TO_FDX[el.type] || "Action";
      const text = escapeXml(el.text || "");
      return `    <Paragraph Type="${fdxType}">
      <Text>${text}</Text>
    </Paragraph>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="2">
  <Content>
    <TitlePage>
      <Content>
        <Paragraph Alignment="Center" Type="Custom">
          <Text>${escapeXml(title)}</Text>
        </Paragraph>
        <Paragraph Alignment="Center" Type="Custom">
          <Text>Written with SPX Script — StreamPireX</Text>
        </Paragraph>
        <Paragraph Alignment="Center" Type="Custom">
          <Text>${now.slice(0, 10)}</Text>
        </Paragraph>
      </Content>
    </TitlePage>
${paragraphsXml}
  </Content>
  <SpellCheckIgnoreLists>
    <SpellCheckIgnoreList Type="Abbreviations" />
  </SpellCheckIgnoreLists>
  <PageLayout BackgroundColor="#FFFFFFFFFFFF" BottomMargin="72" BreakDialogueAndActionAtSentences="Yes" DocumentLeading="Normal" FooterMargin="36" ForegroundColor="#000000000000" HeaderMargin="36" InvisiblesColor="#AAAAAAAAAAAA" TopMargin="72" />
  <AutoCast />
  <Watermarking Text="" />
  <ScriptNotes />
  <Revisions ActiveSet="0" Location="26" ShowAllMarks="No" ShowAllSets="No">
    <Revision Color="#000000" FullRevision="No" ID="1" Mark="*" Name="Production Draft" />
  </Revisions>
  <SplitState IsSplit="No" />
  <TextState />
</FinalDraft>`;
}

// ── FILE HELPERS ───────────────────────────────────────────────────────────

/** Trigger browser download of an FDX file */
export function downloadFDX(title, elements) {
  const content = exportFDX(title, elements);
  const blob = new Blob([content], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.fdx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Trigger browser download of a Fountain (.fountain) file */
export function downloadFountain(title, elements) {
  const lines = [
    `Title: ${title}`,
    "Credit: Written by",
    "Author:",
    `Draft date: ${new Date().toISOString().slice(0, 10)}`,
    "Contact:",
    "",
  ];

  elements.forEach((el) => {
    switch (el.type) {
      case "heading":
        lines.push("", el.text.toUpperCase(), "");
        break;
      case "action":
        lines.push("", el.text, "");
        break;
      case "character":
        lines.push("", el.text.toUpperCase());
        break;
      case "dialogue":
        lines.push(el.text, "");
        break;
      case "paren":
        lines.push(el.text.startsWith("(") ? el.text : `(${el.text})`);
        break;
      case "transition":
        lines.push("", `${el.text.toUpperCase()}`, "");
        break;
      case "note":
        lines.push(`/* ${el.text} */`);
        break;
      default:
        lines.push(el.text);
    }
  });

  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/\s+/g, "_")}.fountain`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Read an FDX file from a File object (from <input type="file">) */
export function readFDXFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith(".fdx") && !file.name.endsWith(".xml")) {
      reject(new Error("Please select a .fdx or .xml file"));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseFDX(e.target.result);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/** Read a Fountain (.fountain) file */
export function readFountainFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = parseFountain(e.target.result);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

/** Basic Fountain parser */
export function parseFountain(text) {
  const lines = text.split("\n");
  const elements = [];
  let id = 1;
  let title = "IMPORTED SCRIPT";
  let inTitlePage = true;
  let i = 0;

  // Parse title page key-value pairs
  while (i < lines.length && inTitlePage) {
    const line = lines[i].trim();
    if (line === "") { inTitlePage = false; i++; break; }
    const match = line.match(/^([A-Za-z ]+):\s*(.*)$/);
    if (match) {
      if (match[1].toLowerCase() === "title") title = match[2].toUpperCase();
      i++;
    } else {
      inTitlePage = false;
    }
  }

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) { i++; continue; }

    // Scene heading: INT. / EXT. or .FORCED HEADING
    if (/^(INT\.|EXT\.|INT\/EXT\.|I\/E\.)/.test(trimmed) || trimmed.startsWith(".")) {
      elements.push({ id: id++, type: "heading", text: trimmed.replace(/^\./, "") });
    }
    // Transition: ends with TO: or === forced
    else if (/^(FADE|CUT|DISSOLVE|SMASH|MATCH|JUMP|WIPE).*TO:$/.test(trimmed) || trimmed.startsWith(">")) {
      elements.push({ id: id++, type: "transition", text: trimmed.replace(/^>/, "").trim() });
    }
    // Character: ALL CAPS, possibly with (V.O.) etc, preceded by blank line
    else if (trimmed === trimmed.toUpperCase() && trimmed.length > 0 && /^[A-Z]/.test(trimmed) && !trimmed.includes(".")) {
      elements.push({ id: id++, type: "character", text: trimmed });
      i++;
      // Check next lines for parenthetical and dialogue
      while (i < lines.length) {
        const next = lines[i].trim();
        if (!next) break;
        if (next.startsWith("(") && next.endsWith(")")) {
          elements.push({ id: id++, type: "paren", text: next });
        } else {
          elements.push({ id: id++, type: "dialogue", text: next });
        }
        i++;
      }
      continue;
    }
    // Note: /* */ or [[]]
    else if (trimmed.startsWith("/*") || trimmed.startsWith("[[")) {
      elements.push({ id: id++, type: "note", text: trimmed.replace(/^\/\*|\*\/$|^\[\[|\]\]$/g, "").trim() });
    }
    // Everything else is action
    else {
      elements.push({ id: id++, type: "action", text: trimmed });
    }

    i++;
  }

  return { title, elements };
}
