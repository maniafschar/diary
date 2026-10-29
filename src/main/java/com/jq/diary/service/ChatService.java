package com.jq.diary.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.jq.diary.entity.ChatMessage;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Contact.SexualOrientation;
import com.jq.diary.repository.Repository;
import com.jq.diary.util.Utilities;

@Service
public class ChatService {
	private static final int MAX_HISTORY_MESSAGES = 30;
	private static final String SYSTEM_PROMPT = "Du bist ein freundlicher, knapper KI-Chatassistent, "
			+ "handle nie als Mensch. Antworte passend zum bisherigen Gespräch und benutze die beigefügten Kontexte der "
			+ "Person, wenn hilfreich. "
			+ "Frage nicht nach Passwörtern, Zahlungsdaten oder anderen vertraulichen Informationen. "
			+ "Unterscheide belegte Angaben von Vermutungen.";

	@Autowired
	private Repository repository;

	@Autowired
	private AiService aiService;

	public List<ChatMessage> list(final Contact contact) {
		return this.repository.list("from ChatMessage where contact.id=?1 order by id asc", ChatMessage.class,
				contact.getId());
	}

	public ChatMessage send(final Contact contact, final String text) {
		final String input = text == null ? "" : text.trim();
		if (input.isEmpty())
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bitte gib eine Nachricht ein.");
		if (input.length() > Utilities.MAX_TEXT_LENGTH)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Die Nachricht ist zu lang.");

		final List<ChatMessage> messages = new ArrayList<>(this.list(contact));
		messages.add(this.createMessage(contact, AiService.ACTOR_USER, input));
		int firstMessage = Math.max(0, messages.size() - MAX_HISTORY_MESSAGES);
		while (firstMessage < messages.size() && AiService.ACTOR_MODEL.equals(messages.get(firstMessage).getRole()))
			firstMessage++;
		final List<Content> conversation = new ArrayList<>();
		conversation.add(Content.builder().role(AiService.ACTOR_SYSTEM)
				.parts(Part.fromText(SYSTEM_PROMPT + this.context(contact))).build());
		for (int i = firstMessage; i < messages.size(); i++) {
			final ChatMessage message = messages.get(i);
			conversation.add(Content.builder().role(message.getRole()).parts(Part.fromText(message.getNote())).build());
		}

		final String answer = this.aiService.chat(conversation, true);
		final ChatMessage chatMessage = this.createMessage(contact, AiService.ACTOR_MODEL, answer);
		this.repository.save(chatMessage);
		return chatMessage;
	}

	private String context(final Contact contact) {
		final String language = contact.getLanguage() == null ? "Deutsch"
				: Locale.forLanguageTag(contact.getLanguage()).getDisplayLanguage(Locale.GERMAN);
		final SexualOrientation orientation = contact.getSexualOrientation() == null ? SexualOrientation.HETERO
				: contact.getSexualOrientation();
		final StringBuilder context = new StringBuilder(
				"* Der Benutzer möchte die Antwort in der Sprache " + language
						+ " und zusätzlich Vorschläge (auch zu Events im Ausland) nur in " + language.toLowerCase()
						+ "sprachige Quellen" +
						"\n* Er ist " + orientation.getLabel() + " und möchte bevorzugt dazu passende Vorschläge" +
						"\n* Das aktuelle Datum/Uhrzeit ist " + Instant.now() +
						"\n* contactId: " + contact.getId() + " (beim Tooling mitgeben)");
		return context.toString();
	}

	private ChatMessage createMessage(final Contact contact, final String role, final String text) {
		final ChatMessage message = new ChatMessage();
		message.setContact(contact);
		message.setRole(role);
		message.setNote(text);
		return message;
	}
}