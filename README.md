diary
==============================================================================

By [**Mani Afschar Yazdi**](https://diary.cafe)

------------------------------------------------------------------------------

diary is the **Java/HTML5/JavaScript** implemented in pure Java Spring/itext and JavaScript/CSS because of performance, purity of code, ease of developing and maintaining.

Optional outbound AI phone conversations use Twilio Programmable Voice and Gemini. Configure these server environment variables before enabling the feature:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (a voice-enabled Twilio number)
- `APP_VOICE_DESTINATION` (an authorized destination in E.164 format, for example `+49...`)
- `APP_VOICE_PUBLIC_API_URL` (the exact public HTTPS API base reachable by Twilio, including any routing prefix, for example `https://your-domain/rest/api`)

The logged-in user starts calls from the navigation's more menu and must confirm before dialing. Twilio callbacks require a publicly reachable HTTPS deployment; trial accounts may require the destination to be verified. The assistant identifies itself as AI. Conversation turns are held in memory only and are not recorded or persisted by this feature.
