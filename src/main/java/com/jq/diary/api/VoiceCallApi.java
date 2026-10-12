package com.jq.diary.api;

import java.math.BigInteger;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.VoiceCallService;

@RestController
@RequestMapping("api/voice")
public class VoiceCallApi extends ApplicationApi {
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private VoiceCallService voiceCallService;

	@Value("${app.voice.publicApiUrl:}")
	private String publicApiUrl;

	@GetMapping("info")
	public Map<String, Object> getInfo(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId) {
		this.authorizationService.requireContact(contactId, clientId);
		return Map.of("configured", this.voiceCallService.isConfigured(),
				"destination", this.voiceCallService.destination());
	}

	@PostMapping("call")
	public Map<String, String> postCall(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId, @RequestBody final CallRequest request) {
		this.authorizationService.requireContact(contactId, clientId);
		if (!request.confirmed())
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Der Anruf muss bestätigt werden.");
		return Map.of("callSid", this.voiceCallService.startCall(contactId.toString()));
	}

	@PostMapping("webhook/{sessionId}/start")
	public ResponseEntity<String> postStart(@PathVariable final UUID sessionId,
			@RequestParam final MultiValueMap<String, String> parameters,
			@RequestHeader("X-Twilio-Signature") final String signature) {
		this.validateWebhook(sessionId, "start", parameters, signature);
		return this.twiml(this.voiceCallService.openingTwiMl(sessionId));
	}

	@PostMapping("webhook/{sessionId}/gather")
	public ResponseEntity<String> postGather(@PathVariable final UUID sessionId,
			@RequestParam final MultiValueMap<String, String> parameters,
			@RequestHeader("X-Twilio-Signature") final String signature) {
		this.validateWebhook(sessionId, "gather", parameters, signature);
		return this.twiml(this.voiceCallService.continueConversation(sessionId, parameters.getFirst("SpeechResult")));
	}

	@PostMapping("webhook/{sessionId}/status")
	public ResponseEntity<Void> postStatus(@PathVariable final UUID sessionId,
			@RequestParam final MultiValueMap<String, String> parameters,
			@RequestHeader("X-Twilio-Signature") final String signature) {
		this.validateWebhook(sessionId, "status", parameters, signature);
		this.voiceCallService.finish(sessionId);
		return ResponseEntity.noContent().build();
	}

	private void validateWebhook(final UUID sessionId, final String endpoint,
			final MultiValueMap<String, String> parameters, final String signature) {
		final Map<String, String> flattened = new HashMap<>();
		parameters.forEach((key, values) -> flattened.put(key, values.isEmpty() ? "" : values.get(0)));
		final String base = this.publicApiUrl == null ? "" : this.publicApiUrl.replaceAll("/+$", "");
		final String url = base + "/voice/webhook/" + sessionId + "/" + endpoint;
		if (!this.voiceCallService.isValidWebhook(url, flattened, signature))
			throw new ResponseStatusException(HttpStatus.FORBIDDEN);
	}

	private ResponseEntity<String> twiml(final String response) {
		return ResponseEntity.ok().contentType(MediaType.APPLICATION_XML).body(response);
	}

	public record CallRequest(boolean confirmed) {
	}
}