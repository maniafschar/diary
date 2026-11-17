package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.util.List;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.google.genai.types.Content;
import com.jq.diary.entity.ChatMessage;
import com.jq.diary.entity.ChatSummary.Category;
import com.jq.diary.entity.Contact;
import com.jq.diary.repository.Repository;

class ChatServiceTest {
	private final Repository repository = mock(Repository.class);
	private final AiService aiService = mock(AiService.class);
	private final ContextService contextService = mock(ContextService.class);
	private final AiContextTool aiContextTool = mock(AiContextTool.class);
	private final ChatService chatService = new ChatService();
	private final Contact contact = new Contact();

	@BeforeEach
	void setUp() {
		this.contact.setId(BigInteger.ONE);
		ReflectionTestUtils.setField(this.chatService, "repository", this.repository);
		ReflectionTestUtils.setField(this.chatService, "aiService", this.aiService);
		ReflectionTestUtils.setField(this.chatService, "contextService", this.contextService);
		ReflectionTestUtils.setField(this.chatService, "aiContextTool", this.aiContextTool);
		when(this.repository.list(anyString(), eq(ChatMessage.class), eq(BigInteger.ONE))).thenReturn(List.of());
		when(this.contextService.context(this.contact)).thenReturn("");
		when(this.aiService.chat(anyList(), eq(true))).thenReturn("Antwort");
	}

	@Test
	void loadsAndPrioritizesTheMatchingHistoricalContext() {
		when(this.aiContextTool.chatContext(BigInteger.ONE, Category.TRAVEL)).thenReturn("Bevorzugt Bahnreisen.");

		this.chatService.send(this.contact, "Welche Reiseziele passen zu meinem Urlaub?");

		verify(this.aiContextTool).chatContext(BigInteger.ONE, Category.TRAVEL);
		final org.mockito.ArgumentCaptor<List<Content>> conversation =
				org.mockito.ArgumentCaptor.forClass(List.class);
		verify(this.aiService).chat(conversation.capture(), eq(true));
		assertTrue(conversation.getValue().stream().map(Content::text).collect(Collectors.joining("\n"))
				.contains("Berücksichtige diese Informationen vorrangig"));
		assertTrue(conversation.getValue().stream().map(Content::text).collect(Collectors.joining("\n"))
				.contains("Bevorzugt Bahnreisen."));
	}

	@Test
	void doesNotLoadHistoricalContextForAnUnmatchedQuestion() {
		final ChatMessage previousMessage = new ChatMessage();
		previousMessage.setRole(AiService.ACTOR_USER);
		previousMessage.setNote("Ich möchte bald verreisen.");
		when(this.repository.list(anyString(), eq(ChatMessage.class), eq(BigInteger.ONE)))
				.thenReturn(List.of(previousMessage));

		this.chatService.send(this.contact, "Wie spät ist es?");

		verify(this.aiContextTool, never()).chatContext(eq(BigInteger.ONE), eq(Category.CHAT));
		verify(this.aiContextTool, never()).chatContext(eq(BigInteger.ONE), eq(Category.GUIDE));
		verify(this.aiContextTool, never()).chatContext(eq(BigInteger.ONE), eq(Category.PSYCHOLOGY));
		verify(this.aiContextTool, never()).chatContext(eq(BigInteger.ONE), eq(Category.TRAVEL));
	}
}
