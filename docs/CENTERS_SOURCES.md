# Blood center numbers: where each one came from

Collected on 2026-10-20 from published sources. **They are hospital or organisation numbers, not confirmed blood-bank
desks.** Nobody from LIFORA has called them yet. Before launch, call each one, ask for the blood bank / transfusion desk
direct line and opening hours, then update `backend/centers.json` and re-import (`python -m backend.app.import_centers backend/centers.json`).

| Center | Number on the site | Source | Notes |
|---|---|---|---|
| Sylhet MAG Osmani Medical College Hospital | 01335233256 | DGHS facility registry (updated 2026-07-29) | Other sources list 01770-313434 / 0821713487 (old embassy PDF) and +88 02996631213 (UK gov list). Call and pick the blood bank line. Map pin 24.9005, 91.8532 is from Wikipedia. |
| Mount Adora Hospital | 09687225566 | UK gov "Bangladesh doctors and medical facilities" list | Address in that list is Akhalia, Sylhet-Sunamganj Road (the old sample data said Mirabazar, which was wrong). |
| Jalalabad Ragib-Rabeya Medical College Hospital | 01779900016 | UK gov list (main office) | Main office number. |
| Parkview Medical College Hospital | 01849868959 | UK gov list | The list also gives 01746094823 and 01767984114. Address VIP Road, Taltala (old sample data said Telihaor). |
| Sylhet Mujib Jahan Red Crescent Blood Center | 01811458524 | bdrcs.org blood program page | This is the BDRCS blood hotline (9 AM to 5 PM), not a Sylhet desk. The Sylhet center (Chowhatta) is listed there without its own number. |

## Removed from the sample list (no verified number found)
Sylhet General Hospital, City Hospital & Blood Bank, Al-Haramain Hospital Blood Unit: could not confirm they exist as named.
Ibn Sina Hospital (Sobhanighat) and North East Medical College Hospital (South Surma) do exist, but only a personal doctor
number or no number was found. Add them back once you have called and confirmed a number.

## Import into the real database
```bash
DATABASE_URL=<your production url> python -m backend.app.import_centers backend/centers.json
```
Map pins: only Osmani has one. For the others, open the place in Google Maps, copy the latitude/longitude, add `"lat"` and
`"lng"` to the JSON entry and import again. Without a pin the "Get Directions" button searches Google Maps by name and address.
