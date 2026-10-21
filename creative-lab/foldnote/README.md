# Foldnote

A small postcard studio by Chidera Emmanuel. Write a headline, a personal note and a signature; choose an illustrated landscape and colour palette; download a keepsake as PNG or SVG.

## Run

From this project folder, serve the static files:

```sh
python3 -m http.server 8000 --directory dist
```

Open http://localhost:8000. The app uses ES modules, so opening `index.html` directly as a `file://` URL is not supported. There are no dependencies or build steps. The `dist` folder can be deployed on any static host. Pushing the source to GitHub does not configure a live website.

## Make a postcard

- Edit the label (32 characters), headline (48), message (220), and signature (40). The preview updates immediately. Headlines and notes automatically wrap and reduce their font size to fit.
- Pick Rolling hills, By the sea, or Under the stars. Pick Apricot, Lilac, or Blue hour.
- **Another little landscape** changes the composition while keeping your words, scene, and colours.
- **Keep as a picture** exports a 1200 × 1500 PNG. **Download SVG** exports a self-contained vector postcard, suitable for resizing or printing.
- **Save draft** stores one draft in this browser. Saving again replaces it. **Load draft** restores it, including the landscape seed. Drafts are not loaded automatically.
- **Reset example** replaces the editor content with the sample. A previously saved draft remains available until you save again.

Downloads go to the browser's normal destination. Mobile browsers may open an image preview or a share/save sheet instead of downloading directly. If PNG conversion is unavailable, use SVG. PNG rendering needs a browser with Canvas and SVG image support. Exported typography can vary slightly by device because the app uses system fonts.

## Privacy and accessibility

The app makes no API requests and uploads nothing. Drafts are kept only in local storage on the current browser; they do not sync between devices. Storage errors are reported without blocking editing or downloads. Text is added through SVG text nodes, not interpreted as markup. Empty fields are allowed. Newlines and repeated spaces are normalised in the card.

Every editor field has a label and character counter. Scene and palette buttons expose their selection state. The postcard has a screen-reader description containing its written content. All controls work with a keyboard, focus indicators are visible, and the layout stacks on small screens. No external fonts or images are used.

## Validation

```sh
node --check dist/app.mjs
node --test core.test.mjs
```

Tests cover saved draft round trips, invalid storage, text length limits, wrapping without clipping or truncation, long unbroken strings, blank fields, Unicode graphemes, headline fitting, and repeatable illustration generation. PNG and SVG export should also be checked in the target browser, especially on iOS.

Desktop browser checks confirmed live text editing, literal markup-character rendering, full 220-character message fitting, scene/palette selection, landscape changes, draft restoration after reload, and a downloaded PNG with the expected 1200 × 1500 dimensions. Generated SVG markup parsed successfully as XML with no external assets. This browser did not return a successful SVG download event, so that download flow remains unverified. Physical phone testing has not been performed.
