package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.sql.Timestamp;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import com.google.genai.types.Content;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.UserHashtag;
import com.jq.diary.repository.Repository;

class HashtagServiceTest {
	@Test
	void normalizesAndValidatesManualTags() {
		assertEquals(List.of("Freunde", "glücksmoment", "meTime"),
				HashtagService.parse(" #Freunde, freunde, glücksmoment, , meTime "));
		assertThrows(ResponseStatusException.class, () -> HashtagService.parse("ok, <script>"));
	}

	@Test
	void distinguishesOmittedHashtagsFromAnExplicitClear() throws Exception {
		final ObjectMapper mapper = new ObjectMapper();
		assertEquals(false, mapper.readValue("{}", Event.class).isHashtagsProvided());
		assertTrue(mapper.readValue("{\"hashtags\":null}", Event.class).isHashtagsProvided());
		assertEquals("wasser", mapper.readValue("{\"hashtags\":\"wasser\"}", Event.class).getHashtags());
	}

	@Test
	void recordsOnlyNewManualTagsForTheCorrectContact() {
		final Repository repository = mock(Repository.class);
		final HashtagService service = service(repository, mock(AiService.class));
		final Contact contact = contact();
		final UserHashtag previous = new UserHashtag();
		previous.setName("Freunde");
		when(repository.list(any(), eq(UserHashtag.class), eq(contact.getId()))).thenReturn(List.of(previous));
		assertEquals("freunde, Familie", service.saveManual(contact, "freunde, #Familie, familie"));
		final ArgumentCaptor<UserHashtag> captor = ArgumentCaptor.forClass(UserHashtag.class);
		verify(repository).save(captor.capture());
		assertEquals("Familie", captor.getValue().getName());
		assertEquals(contact, captor.getValue().getContact());
	}

	@Test
	void aiUsesOwnerVocabularyNoteAndAverageRatingAndConditionallyWrites() {
		final Repository repository = mock(Repository.class);
		final AiService ai = mock(AiService.class);
		final HashtagService service = service(repository, ai);
		final Event event = new Event();
		event.setId(BigInteger.TEN);
		event.setContact(contact());
		event.setNote("Ein Tag am See");
		event.setRating(160.0);
		event.setRatingCount(2);
		event.setModifiedAt(Timestamp.valueOf("2026-01-01 12:00:00"));
		final UserHashtag tag = new UserHashtag();
		tag.setName("meinSee");
		when(repository.list(any(), eq(UserHashtag.class), eq(event.getContact().getId()))).thenReturn(List.of(tag));
		when(ai.chat(anyList(), eq(false))).thenReturn("[\"wasser\", \"meinSee\"]");

		service.tag(event);

		@SuppressWarnings("unchecked")
		final ArgumentCaptor<List<Content>> conversation = ArgumentCaptor.forClass(List.class);
		verify(ai).chat(conversation.capture(), eq(false));
		final String prompt = conversation.getValue().get(1).text();
		assertTrue(prompt.contains("meinSee") && prompt.contains("Ein Tag am See")
				&& prompt.contains("4.0/5"));
		verify(repository).executeUpdate(
				"update Event set hashtags=?1 where id=?2 and (hashtags is null or trim(hashtags)='') and modifiedAt=?3",
				"wasser, meinSee", event.getId(), event.getModifiedAt());
	}

	@Test
	void invalidAiOutputDoesNotUpdateEvent() {
		final Repository repository = mock(Repository.class);
		final AiService ai = mock(AiService.class);
		final HashtagService service = service(repository, ai);
		final Event event = new Event();
		event.setId(BigInteger.TEN);
		event.setContact(contact());
		when(repository.list(any(), eq(UserHashtag.class), eq(event.getContact().getId()))).thenReturn(List.of());
		when(ai.chat(anyList(), eq(false))).thenReturn("[\"eins\", \"eins\"]");
		assertThrows(IllegalStateException.class, () -> service.tag(event));
		verify(repository, never()).executeUpdate(any(), any(), any());
	}

	private static Contact contact() {
		final Contact contact = new Contact();
		contact.setId(BigInteger.ONE);
		return contact;
	}

	private static HashtagService service(final Repository repository, final AiService ai) {
		final HashtagService service = new HashtagService();
		ReflectionTestUtils.setField(service, "repository", repository);
		ReflectionTestUtils.setField(service, "aiService", ai);
		return service;
	}
}
