// 画面の文言（英語が元の言語。Canva の審査・翻訳用に抽出される）
// 日本語は ../../i18n/ja.ts に同梱し、Canva の翻訳が届くまでの間だけ使う。
import { defineMessages } from "react-intl";

export const messages = defineMessages({
  sampleText: {
    defaultMessage: "Outline Text",
    description:
      "Sample text shown in the text field and preview when the app first opens",
  },
  addToDesign: {
    defaultMessage: "Add to design",
    description:
      "Primary button that renders the outlined text as an image and adds it to the design",
  },
  updateSelected: {
    defaultMessage: "Update selected element",
    description:
      "Primary button shown instead of 'Add to design' while an element created by this app is selected; replaces it with the new settings",
  },
  editingNotice: {
    defaultMessage:
      "You're editing the selected outlined text. Make your changes, then click “Update selected element”.",
    description:
      "Info message shown at the top of the panel while an element created by this app is selected",
  },
  textHeading: {
    defaultMessage: "Text",
    description: "Section heading for the text and font settings",
  },
  textLabel: {
    defaultMessage: "Text",
    description: "Label of the multi-line field where the user types the text to outline",
  },
  loadSelection: {
    defaultMessage: "Use selected text",
    description:
      "Button that copies the text of the currently selected text element in the design into the app's text field",
  },
  fontLabel: {
    defaultMessage: "Font",
    description: "Label of the dropdown for choosing a font",
  },
  fontNotLoadedSuffix: {
    defaultMessage: "{name} (not loaded)",
    description:
      "Font dropdown option for a font file the user uploaded earlier but has not loaded again in this session. {name} is the font file name",
  },
  customFontHint: {
    defaultMessage:
      "You can also use your own font file (.ttf, .otf, .woff, .woff2). Uploaded fonts are available only while the app is open.",
    description: "Helper text above the button for uploading a font file",
  },
  sizeLabel: {
    defaultMessage: "Size",
    description: "Label of the slider for the font size",
  },
  trackingLabel: {
    defaultMessage: "Letter spacing",
    description: "Label of the slider for the space between letters",
  },
  leadingLabel: {
    defaultMessage: "Line spacing",
    description: "Label of the slider for the space between lines",
  },
  alignLeft: {
    defaultMessage: "Left",
    description: "Text alignment option: align text to the left",
  },
  alignCenter: {
    defaultMessage: "Center",
    description: "Text alignment option: center the text",
  },
  alignRight: {
    defaultMessage: "Right",
    description: "Text alignment option: align text to the right",
  },
  textColorLabel: {
    defaultMessage: "Text color",
    description: "Label next to the color swatch for the fill color of the letters",
  },
  joinHeading: {
    defaultMessage: "Corner style",
    description:
      "Section heading for how the corners of the outline strokes are joined (round, miter or bevel), as in Adobe Illustrator",
  },
  joinRound: {
    defaultMessage: "Round",
    description: "Corner style option: rounded corners on the outline",
  },
  joinMiter: {
    defaultMessage: "Miter",
    description: "Corner style option: sharp, pointed corners on the outline",
  },
  joinBevel: {
    defaultMessage: "Bevel",
    description: "Corner style option: cut-off (flattened) corners on the outline",
  },
  outlinesHeading: {
    defaultMessage: "Outlines (top is innermost)",
    description:
      "Section heading for the list of outline layers. The first layer in the list is closest to the letters",
  },
  layerLabel: {
    defaultMessage: "Layer {index} · Width {width}",
    description:
      "Label for one outline layer. {index} is the layer number starting at 1 (innermost), {width} is its thickness in pixels",
  },
  removeLayer: {
    defaultMessage: "Remove",
    description: "Button that removes this outline layer",
  },
  addLayer: {
    defaultMessage: "+ Add outer layer",
    description: "Button that adds a new outline layer outside the existing ones",
  },
  presetPop: {
    defaultMessage: "Pop",
    description: "Preset button: pink, white and navy outlines",
  },
  presetCandy: {
    defaultMessage: "Candy",
    description: "Preset button: pastel pink, yellow, blue and purple outlines",
  },
  presetMono: {
    defaultMessage: "Mono",
    description: "Preset button: black and white outlines",
  },
  qualityHeading: {
    defaultMessage: "Quality",
    description: "Section heading for the resolution of the image added to the design",
  },
  qualityStandard: {
    defaultMessage: "Standard",
    description: "Image quality option: 1x resolution",
  },
  qualityHigh: {
    defaultMessage: "High",
    description: "Image quality option: 2x resolution",
  },
  qualityMax: {
    defaultMessage: "Maximum",
    description: "Image quality option: 3x resolution",
  },
  warnFontFallback: {
    defaultMessage:
      "Couldn't load the font, so a substitute font is shown for now. Check your internet connection.",
    description:
      "Warning shown when a built-in web font can't be downloaded. The preview and added image use a system font instead until the connection recovers",
  },
  errorCustomFontMissing: {
    defaultMessage:
      "The font “{name}” is not loaded. Upload the same font file again.",
    description:
      "Error shown when editing an element that used an uploaded font file that is not loaded in this session. {name} is the font file name",
  },
  errorFontFile: {
    defaultMessage: "This font file couldn't be loaded.",
    description: "Error shown when an uploaded font file is broken or unsupported",
  },
  errorFontFileType: {
    defaultMessage: "Choose a font file (.ttf, .otf, .woff or .woff2).",
    description: "Error shown when the user selects a file that is not a font file",
  },
  errorAdd: {
    defaultMessage: "Couldn't add to the design. Please try again.",
    description: "Error shown when adding the outlined text to the design fails",
  },
  errorUpdate: {
    defaultMessage: "Couldn't update the element. Please try again.",
    description: "Error shown when updating the selected outlined text fails",
  },
});
