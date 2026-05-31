# Set Templates

Version-controlled JSON checklists. Import one via **Import → JSON Template** to
instantiate a set plus its full checklist and parallels. This is the reusable,
git-tracked "track against any set" mechanism.

## Format

```jsonc
{
  "name": "Prizm Premier League",          // required
  "sport": "Soccer",                        // defaults to Soccer
  "manufacturer": "Panini",
  "brand": "Prizm",
  "year": 2024,
  "season": "2023-24",
  "description": "…",
  "parallels": [
    { "name": "Base", "isBase": true },
    { "name": "Silver" },
    { "name": "Gold", "printRun": 10 }
  ],
  "cards": [
    {
      "cardNumber": "1",
      "playerName": "Lionel Messi",
      "teamName": "Inter Miami CF",
      "teamType": "CLUB",                    // CLUB | NATIONAL
      "kitType": "CLUB",                     // CLUB | COUNTRY | NONE
      "isRookie": false,
      "isAutograph": false,
      "isRelic": false
    }
  ]
}
```

Re-importing the same template updates cards in place (keyed by card number),
so it is safe to refine a checklist over time.
