package com.jq.diary.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import com.google.genai.types.Content;
import com.google.genai.types.Part;
import com.jq.diary.entity.ChatMessage;
import com.jq.diary.entity.ChatSummary;
import com.jq.diary.entity.Contact;
import com.jq.diary.repository.Repository;
import com.jq.diary.util.Utilities;

@Service
public class ChatService {
	private static final int MAX_HISTORY_MESSAGES = 30;
	private static final String SYSTEM_PROMPT = "Du bist ein freundlicher, knapper deutschsprachiger KI-Chatassistent, "
			+ "hndle nie als Mensch. Antworte passend zum bisherigen Gespräch und benutze die beigefügten Kontexte der "
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

	public String send(final Contact contact, final String text) {
		final String input = text == null ? "" : text.trim();
		if (input.isEmpty())
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bitte gib eine Nachricht ein.");
		if (input.length() > Utilities.MAX_TEXT_LENGTH)
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Die Nachricht ist zu lang.");

		final ChatMessage userMessage = this.createMessage(contact, "user", input);
		this.repository.save(userMessage);
		final List<ChatMessage> messages = this.list(contact);
		int firstMessage = Math.max(0, messages.size() - MAX_HISTORY_MESSAGES);
		while (firstMessage < messages.size() && "assistant".equals(messages.get(firstMessage).getRole()))
			firstMessage++;
		final List<Content> conversation = new ArrayList<>();
		for (int i = firstMessage; i < messages.size(); i++) {
			final ChatMessage message = messages.get(i);
			String messageText = message.getNote();
			if (message.getId().equals(userMessage.getId()))
				messageText = SYSTEM_PROMPT + this.context(contact)
						+ "\n\nAktuelle Nachricht: " + messageText;
			conversation.add(Content.builder().role("assistant".equals(message.getRole()) ? "model" : "user")
					.parts(Part.fromText(messageText)).build());
		}

		final String answer = this.aiService.chatReply(conversation, true);
		this.repository.save(this.createMessage(contact, "assistant", answer));
		return answer;
	}

	private String context(final Contact contact) {
		final List<ChatSummary> chatSummaries = this.repository.list("from ChatSummary where contact.id=?1",
				ChatSummary.class, contact.getId());
		final StringBuilder context = new StringBuilder(
				"Der Benutzer möchte die Antwort in deutscher Sprache. Er möchte lediglich deutsch- und englischsprachige "
						+ "Vorschläge, auch wenn sich Events im Ausland als Vorschläge ergeben. Er ist hetro und möchte bevorzugt "
						+ "solche Vorschläge. Die aktuelle Uhrzeit ist " + Instant.now());
		for (final ChatSummary chatSummary : chatSummaries) {
			context.append("\n\n\n\n**");
			context.append(chatSummary.getCategory().getLabel());
			context.append("**\n");
			context.append(chatSummary.getNote());
		}
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