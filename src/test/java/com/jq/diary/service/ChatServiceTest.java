package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import reactor.core.Disposable;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import com.google.genai.types.Content;
import com.jq.diary.entity.ChatMessage;
import com.jq.diary.entity.ChatSummary.Category;
import com.jq.diary.entity.Contact;
import com.jq.diary.repository.Repository;

class ChatServiceTest {
	private final Repository repository = mock(Repository.class);
	private final AiService aiService = mock(AiService.class);
	private final ContextService contextService = mock(ContextService.class);
	private final ChatService chatService = new ChatService();
	private final Contact contact = new Contact();

	@BeforeEach
	void setUp() {
		this.contact.setId(BigInteger.ONE);
		ReflectionTestUtils.setField(this.chatService, "repository", this.repository);
		ReflectionTestUtils.setField(this.chatService, "aiService", this.aiService);
		ReflectionTestUtils.setField(this.chatService, "contextService", this.contextService);
		when(this.repository.list(anyString(), eq(ChatMessage.class), eq(BigInteger.ONE))).thenReturn(List.of());
		when(this.contextService.context(this.contact)).thenReturn("");
		when(this.aiService.chat(anyList(), eq(true))).thenReturn("Antwort");
	}

	@Test
	void loadsAndPrioritizesTheMatchingHistoricalContext() {
		when(this.contextService.chatContext(BigInteger.ONE, Category.TRAVEL)).thenReturn("Bevorzugt Bahnreisen.");

		this.chatService.send(this.contact, "Welche Reiseziele passen zu meinem Urlaub?");

		verify(this.contextService).chatContext(BigInteger.ONE, Category.TRAVEL);
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

		verify(this.contextService, never()).chatContext(eq(BigInteger.ONE), eq(Category.CHAT));
		verify(this.contextService, never()).chatContext(eq(BigInteger.ONE), eq(Category.GUIDE));
		verify(this.contextService, never()).chatContext(eq(BigInteger.ONE), eq(Category.PSYCHOLOGY));
		verify(this.contextService, never()).chatContext(eq(BigInteger.ONE), eq(Category.TRAVEL));
	}

	@Test
	void completesAndSavesTheAnswerAfterTheClientDisconnects() {
		final Sinks.Many<String> source = Sinks.many().unicast().onBackpressureBuffer();
		final AtomicBoolean cancelled = new AtomicBoolean();
		when(this.aiService.stream(anyList(), eq(true)))
				.thenReturn(source.asFlux().doOnCancel(() -> cancelled.set(true)));
		final Flux<String> response = this.chatService.stream(this.contact, "Hallo");
		final StringBuilder received = new StringBuilder();
		final Disposable client = response.subscribe(received::append);

		source.tryEmitNext("  Erste ");
		client.dispose();
		source.tryEmitNext("Antwort.  ");
		source.tryEmitComplete();

		assertFalse(cancelled.get());
		assertEquals("  Erste ", received.toString());
		final org.mockito.ArgumentCaptor<ChatMessage> messages = org.mockito.ArgumentCaptor.forClass(ChatMessage.class);
		verify(this.repository, times(2)).save(messages.capture());
		assertEquals(AiService.ACTOR_USER, messages.getAllValues().get(0).getRole());
		assertEquals(AiService.ACTOR_MODEL, messages.getAllValues().get(1).getRole());
		assertEquals("Erste Antwort.", messages.getAllValues().get(1).getNote());
		assertEquals("  Erste Antwort.  ", response.collectList().block().stream().collect(Collectors.joining()));
		verify(this.aiService, times(1)).stream(anyList(), eq(true));
	}

	@Test
	void doesNotSaveAnIncompleteOrEmptyAnswer() {
		when(this.aiService.stream(anyList(), eq(true)))
				.thenReturn(Flux.concat(Flux.just("Teilantwort"), Flux.error(new IllegalStateException("Fehler"))))
				.thenReturn(Flux.just("   "));

		assertThrows(IllegalStateException.class, () -> this.chatService.stream(this.contact, "Hallo").blockLast());
		assertThrows(IllegalStateException.class, () -> this.chatService.stream(this.contact, "Hallo").blockLast());

		final org.mockito.ArgumentCaptor<ChatMessage> messages = org.mockito.ArgumentCaptor.forClass(ChatMessage.class);
		verify(this.repository, times(2)).save(messages.capture());
		assertTrue(messages.getAllValues().stream().allMatch(message -> AiService.ACTOR_USER.equals(message.getRole())));
	}
}
