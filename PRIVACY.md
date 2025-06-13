# Privacy Policy & Data Collection

Vibe Browser is committed to protecting your privacy while providing an excellent user experience. This document explains what data we collect, how we use it, and how you can control it.

## What We Collect

### Anonymous Usage Analytics (Umami)
We collect anonymous usage data to understand how Vibe Browser is used and improve the product:

- **App lifecycle events**: Start, shutdown, uptime
- **Navigation patterns**: Page loads, back/forward actions, reload frequency
- **Tab management**: Creation, closure, switching behavior, tab counts
- **UI interactions**: Navigation clicks, feature usage
- **Chat usage**: Message frequency, response metrics (no content)

### Error Reporting (Sentry)
We collect error reports to identify and fix bugs:

- **Crash reports**: Application crashes and error stack traces
- **Performance data**: Response times and performance bottlenecks
- **System information**: OS version, app version (no personal identifiers)

## What We DON'T Collect

- **Personal information**: No names, emails, or personal identifiers
- **Browsing content**: No URLs, page content, or browsing history
- **Message content**: No chat messages or conversations
- **Files or documents**: No local files or uploaded content
- **Authentication data**: No API keys or login credentials

## How to Opt Out

### Complete Opt-Out
Add to your `.env` file:
```
TELEMETRY_ENABLED=false
```

## Data Retention

- **Usage analytics**: 90 days maximum retention
- **Error reports**: Managed by Sentry's retention policy
- **Local data**: All user data remains on your device

## Third-Party Services

### Umami Analytics
- **Purpose**: Privacy-focused web analytics
- **Data**: Anonymous usage patterns only
- **Location**: Self-hosted at analytics.cobrowser.xyz
- **Privacy**: GDPR compliant, no cookies, respects DNT

### Sentry
- **Purpose**: Error tracking and performance monitoring
- **Data**: Error reports and performance metrics
- **Sampling**: 10% of sessions in production, 100% in development
- **Privacy**: No personal data included in reports

## Your Rights

- **Transparency**: All tracking code is open source and auditable
- **Control**: Multiple opt-out mechanisms available
- **Access**: No personal data is collected to access
- **Deletion**: Anonymous data cannot be traced back to individuals

## Contact

For privacy questions or concerns:
- Email: michel@cobrowser.xyz
- Open an issue on GitHub
- Review our open source tracking implementation in the codebase

---

*Last updated: June 12, 2025*
*This privacy policy applies to Vibe Browser v0.1.0 and later.*