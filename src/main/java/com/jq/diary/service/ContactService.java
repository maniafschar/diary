package com.jq.diary.service;

import java.math.BigInteger;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.EventImage;
import com.jq.diary.entity.EventLink;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository;
import com.jq.diary.repository.Repository.Attachment;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@Service
public class ContactService {
	@Autowired
	private Repository repository;

	@PersistenceContext
	private EntityManager em;

	public List<Contact> list(final Client client) {
		return this.repository.list(
				"from Contact as contact inner join contact.clients as clients where clients.id=?1 order by contact.name",
				Contact.class, client.getId());
	}

	public List<ContactEvent> listEvent(final BigInteger eventId) {
		return this.repository.list("from ContactEvent where event.id=?1", ContactEvent.class, eventId);
	}

	public Contact one(final BigInteger id) {
		return this.repository.one(Contact.class, id);
	}

	public void delete(final ContactEvent contactEvent) {
		this.repository.delete(contactEvent);
	}

	@Transactional
	public void delete(final Contact contact) {
		if (BigInteger.ONE.equals(contact.getId()) || "aaron@diary.cafe".equalsIgnoreCase(contact.getEmail())
				|| "mani.afschar@jq-consulting.de".equalsIgnoreCase(contact.getEmail()))
			return;

		final BigInteger id = contact.getId();
		final List<EventLink> links = this.em.createQuery("from EventLink where contact.id=:id", EventLink.class)
				.setParameter("id", id).getResultList();
		final List<Event> linkedEvents = this.em.createQuery(
				"select distinct e from Event e join e.eventLinks l where l.contact.id=:id", Event.class)
				.setParameter("id", id).getResultList();
		for (final Event event : linkedEvents)
			event.getEventLinks().removeAll(links);
		this.em.flush();

		for (final EventImage image : this.em.createQuery(
				"from EventImage where contact.id=:id or event.id in (select e.id from Event e where e.contact.id=:id)",
				EventImage.class)
				.setParameter("id", id).getResultList()) {
			Attachment.delete(image);
			this.em.remove(image);
		}
		for (final String entity : List.of("ContactEvent", "EventFeedback", "EventRating"))
			this.em.createQuery("delete from " + entity
					+ " where contact.id=:id or event.id in (select e.id from Event e where e.contact.id=:id)")
					.setParameter("id", id).executeUpdate();
		this.em.flush();

		final List<EventLink> affectedLinks = this.em.createQuery(
				"select distinct l from Event e join e.eventLinks l where e.contact.id=:id", EventLink.class)
				.setParameter("id", id).getResultList();
		this.em.createQuery("delete from PushDelivery where eventId in (select e.id from Event e where e.contact.id=:id)")
				.setParameter("id", id).executeUpdate();
		for (final Event event : this.em.createQuery("from Event where contact.id=:id", Event.class)
				.setParameter("id", id).getResultList())
			this.em.remove(event);
		this.em.flush();
		for (final EventLink link : affectedLinks)
			if (this.em.createQuery("select count(e) from Event e join e.eventLinks l where l.id=:id", Long.class)
					.setParameter("id", link.getId()).getSingleResult() == 0)
				this.em.remove(link);
		links.forEach(this.em::remove);
		this.em.createQuery("delete from PushDelivery where device.contact.id=:id").setParameter("id", id)
				.executeUpdate();
		for (final String entity : List.of("PushDevice", "ContactToken", "ChatMessage", "ChatSummary", "UserHashtag"))
			this.em.createQuery("delete from " + entity + " where contact.id=:id").setParameter("id", id)
					.executeUpdate();
		for (final Location location : this.em.createQuery("from Location where contact.id=:id", Location.class)
				.setParameter("id", id).getResultList())
			location.setContact(null);
		final Contact managed = this.em.find(Contact.class, id);
		Attachment.delete(managed);
		this.em.remove(managed);
	}

	public void save(final ContactEvent contactEvent) {
		this.repository.save(contactEvent);
	}

	public void save(final Contact contact) {
		this.repository.save(contact);
	}
}
