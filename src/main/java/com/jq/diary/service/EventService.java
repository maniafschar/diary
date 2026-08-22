package com.jq.diary.service;

import java.math.BigInteger;
import java.util.List;

import org.apache.commons.mail.EmailException;
import org.apache.logging.log4j.util.Strings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.EventFeedback;
import com.jq.diary.entity.EventImage;
import com.jq.diary.entity.EventRating;
import com.jq.diary.repository.Repository;
import com.jq.diary.repository.Repository.Attachment;
import com.jq.diary.util.Utilities;

@Service
public class EventService {
	@Autowired
	private Repository repository;

	public List<Event> list(final Client client) {
		return this.repository.list(
				"from Event event where event.contact.client.id=?1 order by date desc",
				Event.class, client.getId());
	}

	public List<Event> listContact(final BigInteger contactId) {
		return this.repository.list(
				"select e from Event e, ContactEvent ce where ce.contact.id=?1 and ce.event.id=e.id",
				Event.class, contactId);
	}

	public void delete(final Event event) {
		this.repository.delete(event);
	}

	public Event one(final BigInteger id) {
		return this.repository.one(Event.class, id);
	}

	public boolean exists(final Event event) {
		return this.repository.list(
				"from Event where contact.id=?1 and date=cast(?2 as timestamp)",
				Event.class, event.getContact().getId(), event.getDate().toInstant().toString().substring(0, 19))
				.size() > 0;
	}

	public void save(final Event event) {
		final BigInteger id = event.getId();
		this.repository.save(event);
		if (id == null) {
			final ContactEvent contactEvent = new ContactEvent();
			contactEvent.setContact(event.getContact());
			contactEvent.setEvent(event);
			this.repository.save(contactEvent);
		}
	}

	public EventRating putRating(final BigInteger eventId, final BigInteger contactId, final Double rating) {
		final EventRating eventRating;
		final List<EventRating> list = this.repository
				.list("from EventRating where contact.id=?1 and event.id=?2", EventRating.class, contactId, eventId);
		if (list.size() > 0)
			eventRating = list.get(0);
		else {
			eventRating = new EventRating();
			eventRating.setContact(this.repository.one(Contact.class, contactId));
			eventRating.setEvent(this.repository.one(Event.class, eventId));
		}
		eventRating.setRating(rating);
		this.repository.save(eventRating);
		return eventRating;
	}

	public void saveFeedback(final EventFeedback feedback) throws EmailException {
		if (!Strings.isEmpty(feedback.getNote()))
			this.repository.save(feedback);
	}

	public void deleteFeedback(final EventFeedback feedback) {
		this.repository.delete(feedback);
	}

	public List<EventFeedback> listFeedback(final Client client) {
		return this.repository.list(
				"from Feedback feedback, Contact contact where feedback.contactId=contact.id and contact.clientId=?1 ORDER BY createdAt DESC",
				EventFeedback.class, client.getId());
	}

	public void save(final EventImage eventImage) {
		byte[] img;
		try {
			img = Utilities.createVideoThumbnail(Attachment.fullPath(eventImage.getImage()));
		} catch (final Exception ex) {
			img = Attachment.image(eventImage.getImage());
		}
		eventImage.setImageThumbnail(Attachment.createImage("jpg", Utilities.scaleImage(img, 150)));
		this.repository.save(eventImage);
	}

	public void delete(final EventImage eventImage) {
		this.repository.delete(eventImage);
	}
}