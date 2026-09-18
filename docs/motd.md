## Message of the Day

Announcements can be published through:

```text
data/motd.json
```

MOTD supports:

- Multiple languages
- Safe inline HTTPS links using `[label](https://example.com)`
- Scheduled start time
- Scheduled end time
- Per-message IDs
- "Don't show again"
- Local dismissal persistence

A new announcement can therefore be published without modifying the application logic.

---

## Small-screen behavior

MOTD cards are height-limited to the available viewport. When a message is taller than the available space, only the message body scrolls while the title, close button, and **Don't show again** control remain accessible. Mobile sizing also accounts for the app header and safe-area insets.
