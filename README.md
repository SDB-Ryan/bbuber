# BBUber

A joke ride hailing site for the Milford Bourbon Boys. It looks and behaves like a real
ride app: a real map of Milford, real roads and fares, drivers who show up and drive you
there. No car ever comes. Nothing is charged. Nothing you type leaves your phone except
map lookups.

There are two parts:

- **The website** (`index.html`): the marketing page, with a fare estimator and the live
  app running inside a phone picture.
- **The app** (`app/`): the full screen ride app. On a phone, "Add to Home Screen" gives a
  BBUber icon that opens it like a real app.

## Changing the jokes, drivers, prices and places

Everything funny lives in one file: **`js/config.js`**. Open it in any text editor,
change the words between the quote marks, save, and publish. The file has notes in it
explaining each section.

| Section | What it controls |
|---|---|
| `brand` | Headline, tagline, the fake payment card, the wallet joke |
| `serviceArea` | Where rides are allowed, and the jokes when someone leaves Milford |
| `pricing`, `receiptFees` | Base fare, per mile, per minute, fees, price of a pour |
| `surge` | The "proof multiplier": when fares go up, and by how much |
| `tiers` | Ride types (Neat, On the Rocks, Barrel Proof, Pappy) |
| `drivers` | The Bourbon Boys: names, cars, plates, bourbons, one-liners |
| `places` | Milford spots shown in the app and the estimator |
| messages, `chat`, `ratingNotes` | Everything the app says during a ride |
| `landing` | The website's section headlines, reviews, driver requirements |
| `disclaimer` | The "this is a joke" text. Keep it. |

Anything marked **PLACEHOLDER** is made up and waiting for the real list.

**Driver photos:** put a square photo in a new `images/drivers/` folder and add a line
like `photo: "images/drivers/mike.jpg",` to that driver.

**New places:** right-click the spot in Google Maps, copy the two numbers it shows, and
use them as `lat` and `lng`.

**Demo the proof multiplier:** set `forceMultiplier: 2.5` under `surge`. Set it back to
`null` afterwards.

## Seeing it on your computer

Open Terminal and run:

```
cd ~/projects/bbuber
python3 -m http.server 8000
```

Then visit http://localhost:8000 in a browser. Double-clicking `index.html` does not work,
because browsers block parts of the app when a page is opened straight from a file.

## Publishing

The site is published by GitHub Pages from the `main` branch of the `bbuber` repository
under the SDB-Ryan GitHub account. Pushing to `main` makes changes live in a minute or two.
The address is https://sdb-ryan.github.io/bbuber/ and the app is at `/bbuber/app/`.

bbuber.com is owned by someone else. To use another domain later, buy it, add a `CNAME`
file with the domain name, point the domain at GitHub Pages, and update the two
`sdb-ryan.github.io` addresses in the `og:` tags at the top of `index.html`.

## What it relies on

All free, no accounts, no keys:

- **Map pictures:** OpenStreetMap's standard tiles, darkened in the browser.
- **Road routes and drive times:** the public OSRM demo server.
- **Address search:** Photon, run by Komoot.
- **Map library:** Leaflet, saved in `vendor/leaflet/` so it can't disappear.

None of the free services promise to stay up. If routing goes down, cars follow a curved
line and fares use straight-line distance plus 30%. If address search goes down, the
Milford spots list and "Set location on map" still work.

## Helper scripts

- `tools/bake-idle-routes.py` records the real road loops the background cars drive.
  Only re-run it to change where they drive.
- `tools/render-icons.sh` turns the icon drawings in `icons/` into the PNG sizes phones
  need, plus the link preview picture. Re-run it after editing any `.svg` in `icons/`.
