diary
==============================================================================

By [**Mani Afschar Yazdi**](https://diary.cafe)

------------------------------------------------------------------------------

diary is the **Java/HTML5/JavaScript** implemented in pure Java Spring/itext and JavaScript/CSS because of performance, purity of code, ease of developing and maintaining.

## Cordova mobile app

The same web client can be built into native iOS and Android WebView apps. Run `npm install` once, then use a simulator or connected device with:

```sh
npm run cordova:ios
npm run cordova:android
```

The iOS build requires Xcode and CocoaPods 1.16 or newer. Android requires Android SDK command-line tools, platform-tools, Android platform 36, and Build Tools 36.0.0. The app bundles the web UI but connects to the production backend at `https://diary.cafe` by default; override `DIARY_API_SERVER` when building for another backend.

Optional outbound AI phone conversations use Twilio Programmable Voice and Gemini. Configure these server environment variables before enabling the feature:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (a voice-enabled Twilio number)
- `APP_VOICE_DESTINATION` (an authorized destination in E.164 format, for example `+49...`)
- `APP_VOICE_PUBLIC_API_URL` (the exact public HTTPS API base reachable by Twilio, including any routing prefix, for example `https://your-domain/rest/api`)

The logged-in user starts calls from the navigation's more menu and must confirm before dialing. Twilio callbacks require a publicly reachable HTTPS deployment; trial accounts may require the destination to be verified. The assistant identifies itself as AI. Conversation turns are held in memory only and are not recorded or persisted by this feature.
