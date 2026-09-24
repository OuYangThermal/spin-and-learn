# Pack Format — Spin & Learn

This file explains the content-pack JSON format used by **Spin & Learn — Classroom Reward Spinner** so future theme packs (Animals, Phonics, Multiplication…) are copy-paste simple.

## 1. Schema

```json
{
  "name": "ESL Basic",
  "description": "24 simple English nouns for young learners.",
  "items": [
    { "q": "apple", "a": "苹果", "hint": "a round red fruit" },
    { "q": "banana", "a": "香蕉", "hint": "a long yellow fruit" }
  ]
}
```

### Field rules

| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | yes | Human-readable pack name. Keep it short (e.g. "Animals", "Phonics"). |
| `description` | string | yes | One or two sentences describing what the pack covers. |
| `items` | array | yes | The word/question list. May be empty only for the Blank pack. |
| `items[].q` | string | yes | The question or word shown first on the card. Must not be empty. |
| `items[].a` | string | no | The answer revealed after pressing "Show Answer". May be omitted or `""`. |
| `items[].hint` | string | no | An optional clue shown to help learners answer. May be omitted or `""`. |
| `_instructions` | string | no | Special field used **only** by the Blank pack (`blank.json`). Plain-language instructions shown to the teacher. |

### Constraints

- Recommended pack size: **24 items** (the default deck length the game is tuned for).
- `q` values should be unique within a pack.
- Keep strings plain text — no HTML tags, no markdown, no newlines inside `q`/`a`/`hint`.
- JSON must be valid UTF-8 and parse cleanly (test with `python3 -c "import json; json.load(open('packs/<id>.json'))"`).

## 2. File naming

Packs live in the `packs/` folder. The file name becomes the pack id:

```
packs/<id>.json
```

Examples:

- `packs/animals.json` → id `animals`
- `packs/phonics.json` → id `phonics`
- `packs/multiplication.json` → id `multiplication`

Use lowercase, hyphens instead of spaces, no special characters.

## 3. How packs get registered

The game discovers packs by scanning the `packs/` folder for `*.json` files. To add a new pack:

1. Create `packs/<id>.json` following the schema above.
2. Fill in `name`, `description`, and 24 items.
3. The pack appears automatically in the pack picker (no code changes needed).

Reserved ids: `blank` is always loaded as the editable Blank / Custom pack — do not overwrite it with a fixed list.

## 4. Full minimal example

```json
{
  "name": "Animals",
  "description": "24 animal names with short English clues.",
  "items": [
    { "q": "lion", "a": "狮子", "hint": "king of the jungle" },
    { "q": "panda", "a": "熊猫", "hint": "eats bamboo" }
  ]
}
```

For the editable blank pack, use this shape instead:

```json
{
  "name": "Blank / Custom",
  "description": "An empty pack for your own words.",
  "items": [],
  "_instructions": "In the Word List panel, paste one item per line as: question | answer | hint"
}
```

## 5. The Word List panel format (for teachers)

When teachers add their own words in-game, they paste text one item per line:

```
apple | 苹果 | a round red fruit
banana | 香蕉
```

- Fields are separated by `|` (pipe).
- `question` is required; `answer` and `hint` are optional.
- Blank lines are ignored.
