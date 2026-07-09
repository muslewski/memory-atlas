/**
 * Zero-dependency parser for the SUBSET of YAML that the Atlas note templates
 * emit (SPEC.md §3). This is a deliberate constraint, not a general YAML
 * parser — do not grow it into one (see Plan 003's STOP conditions).
 *
 * Supported subset:
 *   - A leading `---` fence, a closing `---` fence; everything after the
 *     closing fence is the note `body`, returned verbatim.
 *   - `key: scalar` lines. Scalars are: single- or double-quoted strings,
 *     bare (unquoted) strings, bare integers/decimals (parsed as JS Number —
 *     matches common YAML-parser behavior; note this means an all-digit
 *     bare token loses meaning as a string, e.g. a leading zero — quote any
 *     scalar that must stay a literal digit string), `true`/`false`,
 *     `null`/`~`, and empty (`key:` with nothing after it) → `""` UNLESS
 *     indented children follow, in which case the value is a nested
 *     map/array (see below).
 *   - Inline arrays: `key: [a, "b", 3]`.
 *   - Block arrays of scalars:
 *       key:
 *         - item
 *         - "quoted item"
 *         - [[wikilink]]
 *   - Block arrays of one-level maps (e.g. `invariants:`):
 *       key:
 *         - rule: "..."
 *           enforcedBy: ["a", "b"]
 *     (continuation keys must align two spaces past the `- `.)
 *   - One level of nested maps (e.g. `owns:`):
 *       key:
 *         nested: []
 *         other:
 *           - item
 *   - `# comment` stripped when outside quotes (comment must be preceded by
 *     start-of-line or whitespace, matching common YAML convention).
 *
 * NOT supported (will throw or mis-parse — by design, these never appear in
 * the templates this parser targets): multi-line scalars (`|`, `>`), flow
 * maps (`{a: 1}`), anchors/aliases, tabs in indentation, more than one level
 * of map nesting, arbitrary depth block-array-of-arrays.
 *
 * Exports `parseFrontmatter(text) -> { data, body }`. Throws on structural
 * violations: missing/unclosed fence, tab indentation, an indent deeper than
 * any parent expects, or a line that isn't `key: value` / `- item` where one
 * is expected.
 */

function indentOf(line) {
  let i = 0
  while (i < line.length && line[i] === ' ') i++
  return i
}

/**
 * Split a raw frontmatter line into [content-without-comment, comment].
 * `comment` includes the leading `#` and is `''` when there is none.
 * Respects single/double quotes so a `#` inside a quoted scalar is kept.
 */
export function splitComment(line) {
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === "'" && !inDouble) {
      inSingle = !inSingle
    } else if (c === '"' && !inSingle) {
      inDouble = !inDouble
    } else if (c === '#' && !inSingle && !inDouble) {
      if (i === 0 || line[i - 1] === ' ' || line[i - 1] === '\t') {
        return [line.slice(0, i), line.slice(i)]
      }
    }
  }
  return [line, '']
}

function stripComment(line) {
  return splitComment(line)[0]
}

/** First unquoted `:` that is followed by a space or end-of-string, or -1. */
function findColon(s) {
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (c === "'" && !inDouble) {
      inSingle = !inSingle
    } else if (c === '"' && !inSingle) {
      inDouble = !inDouble
    } else if (c === ':' && !inSingle && !inDouble) {
      const next = s[i + 1]
      if (next === undefined || next === ' ') return i
    }
  }
  return -1
}

function looksLikeMapItemStart(s) {
  return /^[A-Za-z_][A-Za-z0-9_]*\s*:(\s|$)/.test(s)
}

function splitTopLevel(s, sep) {
  const parts = []
  let cur = ''
  let inSingle = false
  let inDouble = false
  for (const ch of s) {
    if (ch === "'" && !inDouble) inSingle = !inSingle
    else if (ch === '"' && !inSingle) inDouble = !inDouble
    if (ch === sep && !inSingle && !inDouble) {
      parts.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  parts.push(cur)
  return parts.map((p) => p.trim())
}

function parseScalar(raw) {
  const s = raw.trim()
  if (s === '') return ''
  if (s === 'true') return true
  if (s === 'false') return false
  if (s === 'null' || s === '~') return null
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s)
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1)
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1)
  return s
}

function parseInlineArray(raw) {
  const trimmed = raw.trim()
  const inner = trimmed.slice(1, -1).trim()
  if (inner === '') return []
  return splitTopLevel(inner, ',').map((item) => parseScalar(item))
}

/** Parse a `key: value` mapping block at exactly `indent` until dedent/EOF. */
function parseMapBlock(lines, pos, indent) {
  const result = {}
  while (pos.i < lines.length) {
    const line = lines[pos.i]
    if (line.indent < indent) break
    if (line.indent > indent) {
      throw new Error(`unexpected indent at line ${line.num}: "${line.raw}"`)
    }
    if (line.content.startsWith('- ') || line.content === '-') {
      // A bare array item at map-level indent means the caller mis-detected
      // structure — surface it as a structural violation rather than guess.
      throw new Error(`unexpected list item at line ${line.num}: "${line.raw}"`)
    }
    const colonIdx = findColon(line.content)
    if (colonIdx === -1) {
      throw new Error(`expected "key: value" at line ${line.num}: "${line.raw}"`)
    }
    const key = line.content.slice(0, colonIdx).trim()
    const rest = line.content.slice(colonIdx + 1).trim()
    pos.i += 1

    if (rest === '') {
      const next = lines[pos.i]
      if (next && next.indent > indent) {
        if (next.content.startsWith('- ')) {
          result[key] = parseBlockArray(lines, pos, next.indent)
        } else {
          result[key] = parseMapBlock(lines, pos, next.indent)
        }
      } else {
        result[key] = ''
      }
    } else if (rest.startsWith('[')) {
      result[key] = parseInlineArray(rest)
    } else {
      result[key] = parseScalar(rest)
    }
  }
  return result
}

/** Parse a block array (`- item` / `- key: value`) at exactly `indent`. */
function parseBlockArray(lines, pos, indent) {
  const arr = []
  while (pos.i < lines.length) {
    const line = lines[pos.i]
    if (line.indent !== indent) break
    if (!line.content.startsWith('- ') && line.content !== '-') break

    const itemContent = line.content === '-' ? '' : line.content.slice(2)
    pos.i += 1

    if (itemContent !== '' && looksLikeMapItemStart(itemContent)) {
      const colonIdx = findColon(itemContent)
      const key = itemContent.slice(0, colonIdx).trim()
      const rest = itemContent.slice(colonIdx + 1).trim()
      const map = {}
      if (rest.startsWith('[')) map[key] = parseInlineArray(rest)
      else map[key] = parseScalar(rest)

      const contIndent = indent + 2
      while (pos.i < lines.length && lines[pos.i].indent === contIndent) {
        const cline = lines[pos.i]
        const cColon = findColon(cline.content)
        if (cColon === -1) break
        const ckey = cline.content.slice(0, cColon).trim()
        const crest = cline.content.slice(cColon + 1).trim()
        pos.i += 1
        map[ckey] = crest.startsWith('[') ? parseInlineArray(crest) : parseScalar(crest)
      }
      arr.push(map)
    } else {
      arr.push(parseScalar(itemContent))
    }
  }
  return arr
}

/**
 * @param {string} text full note file contents
 * @returns {{ data: Record<string, unknown>, body: string }}
 */
export function parseFrontmatter(text) {
  const rawLines = text.split('\n')

  if (rawLines.length === 0 || rawLines[0].trim() !== '---') {
    throw new Error('frontmatter must start with a "---" fence on the first line')
  }

  let closeIdx = -1
  for (let i = 1; i < rawLines.length; i++) {
    if (rawLines[i].trim() === '---') {
      closeIdx = i
      break
    }
  }
  if (closeIdx === -1) {
    throw new Error('frontmatter fence was not closed with a second "---"')
  }

  const body = rawLines.slice(closeIdx + 1).join('\n')

  const lines = []
  for (let idx = 0; idx < closeIdx - 1; idx++) {
    const fileLineNum = idx + 2 // 1-based; +1 for the opening fence line
    const raw = rawLines[idx + 1]
    const stripped = stripComment(raw)
    if (stripped.trim() === '') continue
    const leadWhitespace = stripped.match(/^[ \t]*/)[0]
    if (leadWhitespace.includes('\t')) {
      throw new Error(`tab indentation is not supported at line ${fileLineNum}`)
    }
    const indent = indentOf(stripped)
    lines.push({ raw, indent, content: stripped.slice(indent).trimEnd(), num: fileLineNum })
  }

  const pos = { i: 0 }
  const data = parseMapBlock(lines, pos, 0)
  if (pos.i !== lines.length) {
    const leftover = lines[pos.i]
    throw new Error(`unexpected content at line ${leftover.num}: "${leftover.raw}"`)
  }

  return { data, body }
}

/**
 * Rewrite a single top-level `key: value` line inside the frontmatter fence
 * of `text`, preserving any trailing `# comment` and leaving everything else
 * byte-identical. Used by `atlas stamp` for targeted field updates without
 * a lossy parse/reserialize round trip (which would drop comments).
 * Throws if `text` has no frontmatter fence or the key isn't present at the
 * top level.
 *
 * @param {string} text
 * @param {string} key
 * @param {string} value literal replacement value (already formatted, e.g. quoted if needed)
 * @returns {string}
 */
export function setFrontmatterField(text, key, value) {
  const lines = text.split('\n')
  let start = -1
  let end = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (start === -1) start = i
      else {
        end = i
        break
      }
    }
  }
  if (start === -1 || end === -1) {
    throw new Error('setFrontmatterField: no frontmatter fence found')
  }

  const keyRe = new RegExp(`^(${key}):(\\s*)(.*)$`)
  for (let i = start + 1; i < end; i++) {
    const m = lines[i].match(keyRe)
    if (!m) continue
    const [, , , rest] = m
    const [, comment] = splitComment(rest)
    lines[i] = comment ? `${key}: ${value}  ${comment}` : `${key}: ${value}`
    return lines.join('\n')
  }

  throw new Error(`setFrontmatterField: key "${key}" not found in frontmatter`)
}
