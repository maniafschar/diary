package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigInteger;
import java.util.HashSet;
import java.util.Set;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.jq.diary.entity.*;
import com.jq.diary.repository.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

@DataJpaTest
@Import({ Repository.class, ContactService.class })
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class ContactDeletionTest {
	@Autowired
	private EntityManagerFactory factory;
	@Autowired
	private ContactService service;

	@Test
	void deletesOwnedDataAndPreservesOtherContactsAndEvents() {
		final EntityManager em = this.factory.createEntityManager();
		em.getTransaction().begin();
		final Client client = new Client();
		em.persist(client);
		final Contact other = contact(em, client, "other@example.com");
		final Contact deleted = contact(em, client, "deleted@example.com");
		final Location location = new Location();
		location.setContact(deleted);
		location.setClient(client);
		em.persist(location);
		final Event owned = event(em, client, deleted, location);
		final Event retained = event(em, client, other, location);
		final EventLink link = new EventLink();
		link.setContact(deleted);
		em.persist(link);
		final EventLink orphanedLink = new EventLink();
		orphanedLink.setContact(other);
		em.persist(orphanedLink);
		final EventLink retainedLink = new EventLink();
		retainedLink.setContact(other);
		em.persist(retainedLink);
		owned.setEventLinks(new HashSet<>(Set.of(link, orphanedLink, retainedLink)));
		retained.setEventLinks(new HashSet<>(Set.of(link, retainedLink)));
		final ContactEvent participant = new ContactEvent();
		participant.setContact(other);
		participant.setEvent(owned);
		em.persist(participant);
		final EventFeedback feedback = new EventFeedback();
		feedback.setContact(deleted);
		feedback.setEvent(retained);
		em.persist(feedback);
		final EventRating rating = new EventRating();
		rating.setContact(other);
		rating.setEvent(owned);
		em.persist(rating);
		final EventImage image = new EventImage();
		image.setContact(deleted);
		image.setEvent(retained);
		em.persist(image);
		final ContactToken token = new ContactToken();
		token.setContact(deleted);
		token.setToken("token");
		em.persist(token);
		final ChatMessage message = new ChatMessage();
		message.setContact(deleted);
		em.persist(message);
		final ChatSummary summary = new ChatSummary();
		summary.setContact(deleted);
		em.persist(summary);
		final UserHashtag hashtag = new UserHashtag();
		hashtag.setContact(deleted);
		hashtag.setName("test");
		em.persist(hashtag);
		final PushDevice device = new PushDevice();
		device.setContact(deleted);
		device.setToken("device");
		em.persist(device);
		final PushDelivery delivery = new PushDelivery();
		delivery.setDevice(device);
		delivery.setEventId(owned.getId());
		delivery.setKind("test");
		em.persist(delivery);
		final PushDevice otherDevice = new PushDevice();
		otherDevice.setContact(other);
		otherDevice.setToken("other-device");
		em.persist(otherDevice);
		final PushDelivery otherDelivery = new PushDelivery();
		otherDelivery.setDevice(otherDevice);
		otherDelivery.setEventId(owned.getId());
		otherDelivery.setKind("test");
		em.persist(otherDelivery);
		em.getTransaction().commit();
		em.close();

		this.service.delete(deleted);

		final EntityManager check = this.factory.createEntityManager();
		assertNull(check.find(Contact.class, deleted.getId()));
		assertNotNull(check.find(Contact.class, other.getId()));
		assertNotNull(check.find(Client.class, client.getId()));
		assertNull(check.find(Event.class, owned.getId()));
		assertNotNull(check.find(Event.class, retained.getId()));
		assertEquals(1, check.find(Event.class, retained.getId()).getEventLinks().size());
		assertNull(check.find(Location.class, location.getId()).getContact());
		assertNull(check.find(EventLink.class, link.getId()));
		assertNull(check.find(EventLink.class, orphanedLink.getId()));
		assertNotNull(check.find(EventLink.class, retainedLink.getId()));
		assertNull(check.find(ContactEvent.class, participant.getId()));
		assertNull(check.find(EventFeedback.class, feedback.getId()));
		assertNull(check.find(EventRating.class, rating.getId()));
		assertNull(check.find(EventImage.class, image.getId()));
		assertNull(check.find(ContactToken.class, token.getId()));
		assertNull(check.find(ChatMessage.class, message.getId()));
		assertNull(check.find(ChatSummary.class, summary.getId()));
		assertNull(check.find(UserHashtag.class, hashtag.getId()));
		assertNull(check.find(PushDevice.class, device.getId()));
		assertNull(check.find(PushDelivery.class, delivery.getId()));
		assertNotNull(check.find(PushDevice.class, otherDevice.getId()));
		assertNull(check.find(PushDelivery.class, otherDelivery.getId()));
		check.close();
	}

	@Test
	void leavesProtectedContactsUntouched() {
		final Contact first = new Contact();
		first.setId(BigInteger.ONE);
		final Contact demo = new Contact();
		demo.setId(BigInteger.valueOf(999));
		demo.setEmail("Aaron@diary.cafe");
		this.service.delete(first);
		this.service.delete(demo);
	}

	private static Contact contact(final EntityManager em, final Client client, final String email) {
		final Contact contact = new Contact();
		contact.setEmail(email);
		contact.getClients().add(client);
		em.persist(contact);
		return contact;
	}

	private static Event event(final EntityManager em, final Client client, final Contact contact,
			final Location location) {
		final Event event = new Event();
		event.setContact(contact);
		event.setClient(client);
		event.setLocation(location);
		em.persist(event);
		return event;
	}
}
