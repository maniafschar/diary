package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import com.google.genai.types.Content;
import com.jq.diary.entity.ChatMessage;
import com.jq.diary.entity.ChatSummary;
import com.jq.diary.entity.ChatSummary.Category;
import com.jq.diary.entity.Contact;
import com.jq.diary.repository.Repository;

class ChatServiceTest {
	@Test
	void doesNotIncludeSummariesWhenNoCategoryMatches() {
		final String prompt = this.sendWithClassification("{\"categories\":[]}");

		assertFalse(prompt.contains("Private travel note"));
	}

	@Test
	void includesOnlyTheSelectedCategorySummary() {
		final String prompt = this.sendWithClassification("{\"categories\":[\"TRAVEL\"]}");

		assertTrue(prompt.contains("Private travel note"));
	}

	@Test
	@SuppressWarnings("unchecked")
	void carriesPreviousCategoriesIntoClassificationAndPersistsTheNewSelection() {
		final Contact contact = new Contact();
		contact.setId(BigInteger.ONE);
		contact.setLanguage("de");
		contact.setSexualOrientation(Contact.SexualOrientation.HETERO);
		final ChatMessage previousMessage = new ChatMessage();
		previousMessage.setRole(AiService.ACTOR_USER);
		previousMessage.setNote("Ich plane eine Reise.");
		previousMessage.setSummaryCategories("TRAVEL");
		final ChatSummary summary = new ChatSummary();
		summary.setCategory(Category.TRAVEL);
		summary.setNote("Private travel note");

		final Repository repository = mock(Repository.class);
		when(repository.list(eq("from ChatMessage where contact.id=?1 order by id asc"), eq(ChatMessage.class),
				eq(contact.getId()))).thenReturn(List.of(previousMessage));
		when(repository.list(eq("from ChatSummary where contact.id=?1"), eq(ChatSummary.class), eq(contact.getId())))
				.thenReturn(List.of(summary));

		final AiService aiService = mock(AiService.class);
		when(aiService.chatReply(anyList(), eq(false))).thenReturn("{\"categories\":[\"TRAVEL\"]}");
		when(aiService.chatReply(anyList(), eq(true))).thenReturn("Antwort");
		final ChatService service = new ChatService();
		ReflectionTestUtils.setField(service, "repository", repository);
		ReflectionTestUtils.setField(service, "aiService", aiService);
		ReflectionTestUtils.setField(service, "adminService", mock(AdminService.class));

		service.send(contact, "Und was kostet das ungefähr?");

		final ArgumentCaptor<List<Content>> conversationCaptor = ArgumentCaptor.forClass(List.class);
		verify(aiService).chatReply(conversationCaptor.capture(), eq(false));
		assertTrue(this.conversationText(conversationCaptor.getValue().get(0))
				.contains("Bisher aktive Kategorien: TRAVEL"));
		final ArgumentCaptor<ChatMessage> messageCaptor = ArgumentCaptor.forClass(ChatMessage.class);
		verify(repository, times(2)).save(messageCaptor.capture());
		assertEquals("TRAVEL", messageCaptor.getAllValues().get(0).getSummaryCategories());
	}

	@SuppressWarnings("unchecked")
	private String sendWithClassification(final String classification) {
		final Contact contact = new Contact();
		contact.setId(BigInteger.ONE);
		contact.setLanguage("de");
		contact.setSexualOrientation(Contact.SexualOrientation.HETERO);

		final ChatSummary summary = new ChatSummary();
		summary.setCategory(Category.TRAVEL);
		summary.setNote("Private travel note");

		final Repository repository = mock(Repository.class);
		when(repository.list(eq("from ChatMessage where contact.id=?1 order by id asc"), eq(ChatMessage.class),
				eq(contact.getId()))).thenReturn(List.of());
		when(repository.list(eq("from ChatSummary where contact.id=?1"), eq(ChatSummary.class), eq(contact.getId())))
				.thenReturn(List.of(summary));

		final AiService aiService = mock(AiService.class);
		when(aiService.chatReply(anyList(), eq(false))).thenReturn(classification);
		when(aiService.chatReply(anyList(), eq(true))).thenReturn("Antwort");

		final ChatService service = new ChatService();
		ReflectionTestUtils.setField(service, "repository", repository);
		ReflectionTestUtils.setField(service, "aiService", aiService);
		ReflectionTestUtils.setField(service, "adminService", mock(AdminService.class));
		service.send(contact, "Wie spät ist es?");

		final ArgumentCaptor<List<Content>> captor = ArgumentCaptor.forClass(List.class);
		verify(aiService, times(2)).chatReply(captor.capture(), org.mockito.ArgumentMatchers.anyBoolean());
		return this.conversationText(captor.getAllValues().get(1).get(0));
	}

	private String conversationText(final Content content) {
		final StringBuilder text = new StringBuilder();
		for (final var part : content.parts().orElse(List.of()))
			text.append(part.text().orElse(""));
		return text.toString();
	}
}
