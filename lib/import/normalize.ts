import type { ChecklistRow } from "./types";

// Canonical column keys mapped from many possible header spellings.
const HEADER_ALIASES: Record<string, keyof ChecklistRow> = {
  // card number
  "card": "cardNumber",
  "card #": "cardNumber",
  "card number": "cardNumber",
  "no": "cardNumber",
  "no.": "cardNumber",
  "number": "cardNumber",
  "#": "cardNumber",
  // player
  "player": "playerName",
  "name": "playerName",
  "player name": "playerName",
  "subject": "playerName",
  // team
  "team": "teamName",
  "club": "teamName",
  "country": "teamName",
  // descriptive
  "subset": "subset",
  "set": "subset",
  "description": "description",
  "notes": "description",
  // flags
  "rookie": "isRookie",
  "rc": "isRookie",
  "auto": "isAutograph",
  "autograph": "isAutograph",
  "relic": "isRelic",
  "memorabilia": "isRelic",
  "kit": "kitType",
  "kit type": "kitType",
};

export function normalizeHeader(raw: string): keyof ChecklistRow | null {
  const key = raw.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? null;
}

export function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (value == null) return false;
  const s = String(value).trim().toLowerCase();
  return ["1", "true", "yes", "y", "x", "rc", "auto", "relic"].includes(s);
}

export function parseKit(value: unknown): ChecklistRow["kitType"] {
  if (value == null) return undefined;
  const s = String(value).trim().toLowerCase();
  if (["club", "domestic"].includes(s)) return "CLUB";
  if (["country", "national", "international"].includes(s)) return "COUNTRY";
  if (["none", "n/a", ""].includes(s)) return "NONE";
  return undefined;
}

/**
 * Turn a record keyed by raw header strings into a ChecklistRow.
 * Unknown headers are ignored; a special "country"/"club" header also sets kit.
 */
export function rowFromRecord(
  record: Record<string, unknown>,
): ChecklistRow | null {
  const out: ChecklistRow = { cardNumber: "" };
  let sawTeamAsCountry = false;
  let sawTeamAsClub = false;

  for (const [rawHeader, value] of Object.entries(record)) {
    const key = normalizeHeader(rawHeader);
    if (!key) continue;
    const lowered = rawHeader.trim().toLowerCase();
    if (lowered === "country") sawTeamAsCountry = true;
    if (lowered === "club") sawTeamAsClub = true;

    switch (key) {
      case "isRookie":
      case "isAutograph":
      case "isRelic":
        out[key] = parseBool(value);
        break;
      case "kitType":
        out.kitType = parseKit(value);
        break;
      default:
        if (value != null && String(value).trim() !== "") {
          (out as unknown as Record<string, unknown>)[key] = String(value).trim();
        }
    }
  }

  if (!out.cardNumber) return null; // a card number is required

  // Infer kit/teamType from a "country"/"club" column header when explicit kit absent.
  if (!out.kitType) {
    if (sawTeamAsCountry) {
      out.kitType = "COUNTRY";
      out.teamType = "NATIONAL";
    } else if (sawTeamAsClub) {
      out.kitType = "CLUB";
      out.teamType = "CLUB";
    }
  }
  return out;
}
