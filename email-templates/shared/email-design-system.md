# Benchlot Email Design System

All Resend templates share this shell. Template 2 (HubSpot) should be rebuilt in HubSpot's visual editor using the same tokens.

## Brand tokens

| Token | Hex | Usage |
|---|---|---|
| Spruce | `#1a3030` | Wordmark, headings, secondary button/link text |
| Bone | `#f2f0eb` | Page/email background. Never pure white. |
| Honey | `#d4aa60` | Primary CTA backgrounds, pricing, highlights |
| Dark Teal | `#0c1c1e` | CTA text on Honey, dark sections |
| Body text | `#333333` | Paragraph copy |
| Card border | `#e5e3de` | Subtle borders on content cards |

## Typography

- **Display / headings:** Petrona (web-safe fallback: Georgia, serif). 700–800 weight.
- **Body / nav / buttons:** Outfit (web-safe fallback: Arial, Helvetica, sans-serif). 400–700 weight.
- Body copy: 16px, `#333333`, line-height 1.6.

Email font stack:
```
font-family: 'Outfit', Arial, Helvetica, sans-serif;          /* body */
font-family: 'Petrona', Georgia, 'Times New Roman', serif;     /* display */
```

## Layout shell

- **Background:** Bone `#f2f0eb`
- **Content card:** White `#ffffff`, border `1px solid #e5e3de`, max-width `600px`, centered, padding `32px`
- **Header:** Benchlot wordmark (Spruce on Bone) centered, 40px height, linked to `https://benchlot.com`
- **Footer:** Spruce text on Bone. Includes: benchlot.com link, tagline "The woodworker's marketplace.", unsubscribe link, physical address (CAN-SPAM required).

## Buttons

**Primary CTA**
- Background: Honey `#d4aa60`
- Text: Dark Teal `#0c1c1e`
- Font: Outfit bold, 16px
- Height: 48px
- Border radius: 8px
- Full-width on mobile

**Secondary CTA**
- No button background
- Text: Spruce `#1a3030`, underlined link

## Cards (inline content blocks)

Tool / listing / order cards inside the main content card:
- Background: Bone `#f2f0eb`
- Border: `1px solid #e5e3de`
- Padding: 20px
- Border radius: 8px
- Image: full width, rounded 4px top

## Hosted assets

- Logo: Benchlot wordmark SVG, Spruce on Bone background. **Hosted URL, not inline attachment.** TODO: host logo and paste CDN URL here.

## Variables

All templates use Handlebars-style `{{variableName}}`. Resend supports this natively. HubSpot uses its own personalization tokens (`{{ contact.firstname }}`) for Template 2.

## Voice

Direct, warm, zero corporate fluff. Woodworker-to-woodworker. Never "ToolScan" — say "our tool scanner" or "scan your tools." Sign "— Rob, Benchlot" on personal/founder-voice emails; "— Benchlot" for system-level confirmations.
