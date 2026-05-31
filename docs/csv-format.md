# CSV / Excel import format

Spreadsheet checklists are imported **into an existing set** (create the set
first via a JSON template or the Sets page). The first row must be a header.
Column names are matched case-insensitively against these aliases:

| Field        | Accepted headers                                  | Notes |
|--------------|---------------------------------------------------|-------|
| Card number  | `Card #`, `Card`, `No`, `No.`, `Number`, `#`      | **Required.** Strings allowed (`RC-12`). |
| Player       | `Player`, `Name`, `Player Name`, `Subject`        | |
| Team         | `Team`, `Club`, `Country`                          | A `Club`/`Country` header also sets the kit. |
| Kit          | `Kit`, `Kit Type`                                  | `club` / `country` / `none`. |
| Subset       | `Subset`, `Set`                                    | e.g. "Rookies". |
| Description  | `Description`, `Notes`                             | |
| Rookie       | `Rookie`, `RC`                                     | `yes/1/x/true`. |
| Autograph    | `Auto`, `Autograph`                               | |
| Relic        | `Relic`, `Memorabilia`                             | |

- A `Country` column implies **country kit** + national team; a `Club` column
  implies **club kit**. An explicit `Kit` column overrides this.
- Rows without a card number are skipped (reported in the preview).
- Re-importing updates existing cards in place (keyed by card number), so you can
  refine a checklist incrementally.

## Example

```csv
Card #,Player,Club,Rookie
1,Lionel Messi,Inter Miami CF,no
5,Jude Bellingham,Real Madrid,yes
```

## PDF import

PDF checklists have no consistent structure, so import uses a best-effort line
parser (`<card number> <player> - <team>`). **Always review the preview** and, if
many lines are skipped, convert the PDF to CSV/Excel for a clean import.
