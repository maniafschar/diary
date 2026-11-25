diary
==============================================================================

By [**Mani Afschar Yazdi**](https://diary.cafe)

------------------------------------------------------------------------------

diary is the **Java/HTML5/JavaScript** implemented in pure Java Spring/itext and JavaScript/CSS because of performance, purity of code, ease of developing and maintaining.

## Location address details

Before deploying, apply `src/main/resources/db/location-address-details.sql` to the main database. If the `location` table does not yet have the `city` column from the preceding statistics change, also run `ALTER TABLE location ADD COLUMN city VARCHAR(255) NULL;`. These migrations are not applied automatically.

The `addressDetails` property in Location and Event API responses contains the complete address object returned by Nominatim, using its original field names, such as `road`, `house_number`, `postcode`, `city`, `state_district`, `state`, `country` and `country_code`. Fields vary by location and may be absent. The existing `address` is unchanged. Existing locations and new locations with coordinates are enriched in the background, at most once every 15 seconds; missing coordinates cannot be enriched. Failures are logged and retried. Nominatim receives the coordinates; no request is sent for locations without them. Run background enrichment on only one application instance (set `APP_LOCATION_ADDRESS_ENRICHMENT_ENABLED=false` on the others), and account for other applications sharing the same Nominatim usage limit.

## Cordova mobile app

The same web client can be built into native iOS and Android WebView apps. Run `npm install` once, then use a simulator or connected device with:

```sh
npm run cordova:ios
npm run cordova:android
```

The iOS build requires Xcode and CocoaPods 1.16 or newer. Android requires Android SDK command-line tools, platform-tools, Android platform 36, and Build Tools 36.0.0. The app bundles the web UI but connects to the production backend at `https://diary.cafe` by default; override `DIARY_API_SERVER` when building for another backend.

## AI chat provider

The Spring AI provider for chat replies, text summaries, and image prompts is selected on the server with `APP_AI_CHAT_PROVIDER`: `GEMINI` (default), `GPT`/`OPENAI`, `HUGGINGFACE`, or `NONE`. For Hugging Face Inference Providers, configure:

```sh
APP_AI_CHAT_PROVIDER=HUGGINGFACE
APP_HUGGINGFACE_TOKEN=hf_...
APP_HUGGINGFACE_MODEL=google/gemma-2-2b-it
```

The token needs Hugging Face Inference Providers permission and must remain server-side. Actual image rendering still uses Google's Gemini image API; the selected Spring AI provider generates its prompt.

## Event hashtags

Apply `src/main/resources/db/event-hashtags.sql` to the main database before deployment; migrations are not automatic. Events accept comma-separated hashtags (letters, numbers, underscores and hyphens). Previously used manual hashtags remain available even after removal from an event. Search buttons combine selected hashtags as an AND filter with the text and rating filters.

Apply `src/main/resources/db/event-image-dimensions.sql` to the main database before deploying the image-loading skeleton update. New event image uploads store their dimensions for the frontend; existing images without dimensions continue to display but cannot show a correctly sized skeleton before loading.

At midnight server time, the existing AI chat service analyzes the note and average rating of events without hashtags and assigns 1–3 tags, using the event owner's manually used hashtags and the default vocabulary as guidance. Event notes, ratings and that vocabulary are sent to the configured AI service; its existing chat logging also applies. Failed or invalid responses are logged and retried on the next run. Run this job on only one application instance; set `APP_HASHTAG_AUTO_TAGGING_ENABLED=false` on the others, or on all instances to disable automatic tagging.

Optional outbound AI phone conversations use Twilio Programmable Voice and Gemini. Configure these server environment variables before enabling the feature:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (a voice-enabled Twilio number)
- `APP_VOICE_DESTINATION` (an authorized destination in E.164 format, for example `+49...`)
- `APP_VOICE_PUBLIC_API_URL` (the exact public HTTPS API base reachable by Twilio, including any routing prefix, for example `https://your-domain/rest/api`)

The logged-in user starts calls from the navigation's more menu and must confirm before dialing. Twilio callbacks require a publicly reachable HTTPS deployment; trial accounts may require the destination to be verified. The assistant identifies itself as AI. Conversation turns are held in memory only and are not recorded or persisted by this feature.

## iOS push notifications (APNs)

Remote push is currently enabled for iOS only. The native app registers directly with APNs; the Spring server sends notifications with Pushy over APNs HTTP/2. Android push is intentionally not enabled because it requires FCM or another push transport.

Before enabling pushes:

1. Create an Apple APNs authentication key and enable Push Notifications for the `com.jq.diary` App ID. Use provisioning profiles with the Push Notifications capability.
2. Apply `src/main/resources/db/push-notifications.sql` to the application database.
3. Configure these server environment variables. Keep the `.p8` file outside the repository:

```sh
APNS_AUTH_KEY_PATH=/secure/path/AuthKey_XXXXXXXXXX.p8
APNS_TEAM_ID=XXXXXXXXXX
APNS_KEY_ID=XXXXXXXXXX
APNS_TOPIC=com.jq.diary
APNS_SANDBOX=true
```

Use `APNS_SANDBOX=false` for App Store/production builds. The default is sandbox. On first sign-in, iOS asks the user for notification permission. The server sends alerts for new/updated events, participation changes, and once-only reminders about 30 minutes before an event. Device tokens are tied to the signed-in contact; signing out unregisters the current token. The existing contact notification preference is respected.
