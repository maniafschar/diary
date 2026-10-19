package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigInteger;
import java.time.Instant;
import java.util.Date;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import com.jq.diary.entity.BaseEntity;
import com.jq.diary.entity.ChatSummary;
import com.jq.diary.entity.ChatSummary.Category;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository;

class EventContextServiceTest {
	@Test
	void formatsAllEventDetailsForChatContext() {
		final Event first = new Event();
		first.setDate(Date.from(Instant.parse("2025-04-12T14:30:00Z")));
		first.setNote("Ein Spaziergang am See.");
		first.setRating(160.0);
		first.setRatingCount(2);
		final Location location = new Location();
		location.setName("Am See");
		location.setAddress("Uferweg 3");
		location.setNote("Ruhige Umgebung");
		location.setLatitude(48.1);
		location.setLongitude(11.5);
		first.setLocation(location);

		final Event second = new Event();
		second.setDate(Date.from(Instant.parse("2025-04-13T09:00:00Z")));
		second.setNote("Frühstück mit Freunden.");

		final String context = EventContextService.formatEventContext(List.of(first, second));

		assertTrue(context.contains("2025-04-12T14:30:00Z"));
		assertTrue(context.contains("Ort: Am See"));
		assertTrue(context.contains("Adresse: Uferweg 3"));
		assertTrue(context.contains("Ortsbeschreibung: Ruhige Umgebung"));
		assertTrue(context.contains("Koordinaten: 48.1, 11.5"));
		assertTrue(context.contains("Beschreibung: Ein Spaziergang am See."));
		assertTrue(context.contains("Bewertung: 4.0/5 aus 2 Bewertungen"));
		assertTrue(context.contains("2025-04-13T09:00:00Z"));
		assertTrue(context.contains("Beschreibung: Frühstück mit Freunden."));
	}

	@Test
	void omitsEventContextWhenNoEventsExist() {
		assertEquals("", EventContextService.formatEventContext(List.of()));
	}

	@Test
	void recomputesOnlyDuringDailyRefreshAfterAChange() {
		final InMemoryRepository repository = new InMemoryRepository();
		final AiService aiService = mock(AiService.class);
		when(aiService.chatReply(anyList())).thenReturn("Erste Zusammenfassung", "Aktualisierte Zusammenfassung");
		final EventContextService service = new EventContextService();
		ReflectionTestUtils.setField(service, "repository", repository);
		ReflectionTestUtils.setField(service, "aiService", aiService);
		final Contact contact = new Contact();
		contact.setId(BigInteger.ONE);
		final Event event = new Event();
		event.setContact(contact);
		repository.events = List.of(event);

		assertTrue(service.context(contact, Category.CHAT).contains("Erste Zusammenfassung"));
		assertTrue(service.context(contact, Category.CHAT).contains("Erste Zusammenfassung"));
		verify(aiService, times(1)).chatReply(anyList());

		final EventService eventService = new EventService();
		ReflectionTestUtils.setField(eventService, "repository", repository);
		ReflectionTestUtils.setField(eventService, "eventContextService", service);
		eventService.save(event);

		assertTrue(service.context(contact, Category.CHAT).contains("Erste Zusammenfassung"));
		verify(aiService, times(1)).chatReply(anyList());

		service.refresh(contact);

		assertTrue(service.context(contact, Category.CHAT).contains("Aktualisierte Zusammenfassung"));
		verify(aiService, times(2)).chatReply(anyList());
	}

	private static class InMemoryRepository extends Repository {
		private ChatSummary summary;
		private List<Event> events = List.of();

		@Override
		@SuppressWarnings("unchecked")
		public <T extends BaseEntity> List<T> list(final String hql, final Class<T> clazz, final Object... params) {
			if (clazz == ChatSummary.class)
				return this.summary == null ? List.of() : (List<T>) List.of(this.summary);
			if (clazz == Event.class)
				return (List<T>) this.events;
			return List.of();
		}

		@Override
		public void save(final BaseEntity entity) {
			if (entity instanceof final ChatSummary chatSummary)
				this.summary = chatSummary;
			if (entity instanceof Event && entity.getId() == null)
				entity.setId(BigInteger.TWO);
		}

		@Override
		public void delete(final BaseEntity entity) {
			if (entity instanceof ChatSummary)
				this.summary = null;
		}
	}
}