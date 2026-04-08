# Template 10: Message Notification

**ID:** `10-message-notification`
**Provider:** Resend
**Priority:** P5 — needed before scaling.

## Trigger

New message received in a conversation. **Throttled:** maximum 1 email per conversation per hour to prevent inbox spam during active threads.

## Subject line

`New message from {{senderName}} about {{toolTitle}}`

## Variables

| Variable | Type | Example |
|---|---|---|
| `{{recipientName}}` | string | `Rob` |
| `{{senderName}}` | string | display name |
| `{{toolTitle}}` | string | `Stanley No. 5 Jack Plane` |
| `{{messagePreview}}` | string | first 100 chars of message |
| `{{conversationUrl}}` | url | conversation detail page |

## Body copy

```
{{recipientName}},

{{senderName}} sent you a message about {{toolTitle}}:

"{{messagePreview}}..."

[PRIMARY CTA: "View Conversation" → {{conversationUrl}}]

— Benchlot
```

## Notes

- Throttling logic lives in the Cloud Function, not the template. Track `lastEmailSentAt` per conversation per recipient and suppress sends within 60 minutes of the last email.
- Truncate `messagePreview` to 100 characters upstream and append `...` only if truncated.
- Strip line breaks from `messagePreview` to avoid breaking the card layout.
