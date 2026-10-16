package com.jq.diary.service;

import java.net.URI;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Call;
import com.twilio.security.RequestValidator;
import com.twilio.type.PhoneNumber;

@Service
public class VoiceCallService {
	private static final int MAX_TURNS = 10;
	private static final long SESSION_TTL_SECONDS = 900;
	private static final String SYSTEM_PROMPT = "Du bist ein freundlicher, knapper deutschsprachiger Telefonassistent. "
			+ "Du bist eine KI. Behaupte nie, ein Mensch zu sein. Stelle jeweils nur eine kurze Frage, "
			+ "antworte in höchstens zwei kurzen Sätzen und bitte um keine Passwörter, Zahlungsdaten "
			+ "oder anderen vertraulichen Informationen.";

	private final Map<UUID, Conversation> conversations = new ConcurrentHashMap<>();
	private final Map<String, Instant> lastCallByContact = new ConcurrentHashMap<>();
	private final AiService aiService;
	private final String accountSid;
	private final String authToken;
	private final String fromNumber;
	private final String destination;
	private final String publicApiUrl;

	public VoiceCallService(final AiService aiService,
			@Value("${app.voice.twilio.accountSid:}") final String accountSid,
			@Value("${app.voice.twilio.authToken:}") final String authToken,
			@Value("${app.voice.twilio.from:}") final String fromNumber,
			@Value("${app.voice.destination:}") final String destination,
			@Value("${app.voice.publicApiUrl:}") final String publicApiUrl) {
		this.aiService = aiService;
		this.accountSid = accountSid;
		this.authToken = authToken;
		this.fromNumber = fromNumber;
		this.destination = destination;
		this.publicApiUrl = publicApiUrl == null ? "" : publicApiUrl.replaceAll("/+$", "");
	}

	public String startCall(final String contactId) {
		if (!this.isConfigured())
			throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
					"Der KI-Anruf ist noch nicht konfiguriert.");
		final Instant now = Instant.now();
		final Instant previousCall = this.lastCallByContact.get(contactId);
		if (previousCall != null && previousCall.isAfter(now.minusSeconds(60)))
			throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
					"Bitte warte kurz, bevor du einen weiteren Anruf startest.");
		this.lastCallByContact.put(contactId, now);
		this.conversations.entrySet().removeIf(entry -> entry.getValue().createdAt
				.isBefore(now.minusSeconds(SESSION_TTL_SECONDS)));
		final UUID sessionId = UUID.randomUUID();
		this.conversations.put(sessionId, new Conversation());
		try {
			Twilio.init(this.accountSid, this.authToken);
			final URI startUrl = URI.create(this.publicApiUrl + "/voice/webhook/" + sessionId + "/start");
			final URI statusUrl = URI.create(this.publicApiUrl + "/voice/webhook/" + sessionId + "/status");
			final Call call = Call
					.creator(new PhoneNumber(this.destination), new PhoneNumber(this.fromNumber), startUrl)
					.setStatusCallback(statusUrl)
					.setStatusCallbackEvent(List.of("completed", "failed", "busy", "no-answer", "canceled"))
					.create();
			return call.getSid();
		} catch (final RuntimeException ex) {
			this.conversations.remove(sessionId);
			this.lastCallByContact.remove(contactId, now);
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
					"Der Anruf konnte beim Telefoniedienst nicht gestartet werden.", ex);
		}
	}

	public boolean isConfigured() {
		return !this.accountSid.isBlank() && !this.authToken.isBlank() && !this.fromNumber.isBlank()
				&& !this.destination.isBlank() && this.publicApiUrl.startsWith("https://");
	}

	public String destination() {
		return this.destination;
	}

	public boolean isValidWebhook(final String url, final Map<String, String> parameters, final String signature) {
		return !this.authToken.isBlank() && new RequestValidator(this.authToken).validate(url, parameters, signature);
	}

	public String openingTwiMl(final UUID sessionId) {
		this.requireConversation(sessionId);
		return this.gather(sessionId,
				"Hallo, hier spricht der KI-Assistent von Diary Cafe. Ich bin eine künstliche Intelligenz. "
						+ "Bitte teile keine vertraulichen Informationen. Wie kann ich dir helfen?");
	}

	public String continueConversation(final UUID sessionId, final String speech) {
		final Conversation conversation = this.requireConversation(sessionId);
		final String input = speech == null ? "" : speech.trim();
		if (input.isEmpty()) {
			conversation.emptyTurns++;
			if (conversation.emptyTurns >= 2) {
				this.conversations.remove(sessionId);
				return this.sayAndHangUp("Ich habe leider nichts gehört. Auf Wiederhören!");
			}
			return this.gather(sessionId, "Ich habe dich nicht verstanden. Kannst du das bitte wiederholen?");
		}
		conversation.emptyTurns = 0;
		conversation.turns++;
		final String userTurn = conversation.turns == 1 ? SYSTEM_PROMPT + "\n\nAnrufer: " + input : input;
		conversation.history.add(Content.builder().role("user").parts(Part.fromText(userTurn)).build());
		if (this.isGoodbye(input) || conversation.turns >= MAX_TURNS) {
			this.conversations.remove(sessionId);
			return this.sayAndHangUp("Danke für das Gespräch. Auf Wiederhören!");
		}
		try {
			final String answer = this.aiService.chatReply(conversation.history);
			conversation.history.add(Content.builder().role("model").parts(Part.fromText(answer)).build());
			return this.gather(sessionId, answer);
		} catch (final RuntimeException ex) {
			this.conversations.remove(sessionId);
			return this.sayAndHangUp("Entschuldigung, der KI-Dienst ist gerade nicht erreichbar. Auf Wiederhören!");
		}
	}

	public void finish(final UUID sessionId) {
		this.conversations.remove(sessionId);
	}

	private String gather(final UUID sessionId, final String prompt) {
		final String actionUrl = this.publicApiUrl + "/voice/webhook/" + sessionId + "/gather";
		return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Gather input=\"speech\" "
				+ "language=\"de-DE\" speechTimeout=\"auto\" timeout=\"6\" actionOnEmptyResult=\"true\" "
				+ "method=\"POST\" action=\"" + this.escapeXml(actionUrl) + "\"><Say language=\"de-DE\">"
				+ this.escapeXml(prompt)
				+ "</Say></Gather><Say language=\"de-DE\">Ich habe nichts gehört. Auf Wiederhören!</Say>"
				+ "<Hangup/></Response>";
	}

	private String sayAndHangUp(final String text) {
		return "<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response><Say language=\"de-DE\">"
				+ this.escapeXml(text) + "</Say><Hangup/></Response>";
	}

	private String escapeXml(final String text) {
		return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
				.replace("\"", "&quot;").replace("'", "&apos;");
	}

	private boolean isGoodbye(final String input) {
		final String normalized = input.toLowerCase();
		return normalized.matches(".*\\b(auf wiederhören|auf wiedersehen|tschüss|ciao|ende|beenden)\\b.*");
	}

	private Conversation requireConversation(final UUID sessionId) {
		final Conversation conversation = this.conversations.get(sessionId);
		if (conversation == null)
			throw new ResponseStatusException(HttpStatus.NOT_FOUND);
		return conversation;
	}

	private static class Conversation {
		private final Instant createdAt = Instant.now();
		private final List<Content> history = new ArrayList<>();
		private int turns;
		private int emptyTurns;
	}
}