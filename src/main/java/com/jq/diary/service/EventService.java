package com.jq.diary.service;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.math.BigInteger;
import java.util.List;

import javax.imageio.ImageIO;

import org.apache.commons.mail.EmailException;
import org.apache.logging.log4j.util.Strings;
import org.jcodec.api.FrameGrab;
import org.jcodec.common.model.Picture;
import org.jcodec.scale.AWTUtil;
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

@Service
public class EventService {
	private static String THUMBNAIL_TYPE = "png";
	@Autowired
	private Repository repository;

	public List<Event> list(final Client client) {
		return this.repository.list(
				"from Event event where event.contact.client.id=" + client.getId() + " order by date desc",
				Event.class);
	}

	public List<Event> listContact(final BigInteger contactId) {
		return this.repository.list(
				"select e from Event e, ContactEvent ce where ce.contact.id=" + contactId
						+ " and ce.event.id=e.id",
				Event.class);
	}

	public void delete(final Event event) {
		this.repository.delete(event);
	}

	public Event one(final BigInteger id) {
		return this.repository.one(Event.class, id);
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

	public void save(final EventImage eventImage) {
		this.repository.save(eventImage);
		if (eventImage.getImage().endsWith(".mp4") || eventImage.getImage().endsWith(".mov")) {
			final EventImage eventImageVideoThumbnail = new EventImage();
			eventImageVideoThumbnail.setImage(Attachment
					.createImage(THUMBNAIL_TYPE, this.createVideoThumbnail(Attachment.fullPath(eventImage.getImage())))
					.replaceFirst(THUMBNAIL_TYPE,
							eventImage.getImage().substring(0, eventImage.getImage().lastIndexOf('.') + 1)
									+ THUMBNAIL_TYPE));
			this.repository.save(eventImageVideoThumbnail);
		}
	}

	public void deleteImage(final EventImage eventImage) {
		this.repository.delete(eventImage);
	}

	public EventRating putRating(final BigInteger eventId, final BigInteger contactId, final Double rating) {
		final EventRating eventRating;
		final List<EventRating> list = this.repository
				.list("from EventRating where contact.id=" + contactId + " and event.id=" + eventId, EventRating.class);
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

	public void deleteFeedback(final BigInteger id) {
		this.repository.delete(this.repository.one(EventFeedback.class, id));
	}

	public List<EventFeedback> listFeedback(final Client client) {
		return this.repository.list(
				"from Feedback feedback, Contact contact where feedback.contactId=contact.id and contact.clientId="
						+ client.getId() + " ORDER BY createdAt DESC",
				EventFeedback.class);
	}

	private byte[] createVideoThumbnail(final String uri) {
		try {
			final Picture picture = FrameGrab.getFrameFromFile(new File(uri), 0);
			final BufferedImage bufferedImage = AWTUtil.toBufferedImage(picture);
			final ByteArrayOutputStream out = new ByteArrayOutputStream();
			ImageIO.write(bufferedImage, THUMBNAIL_TYPE, out);
			return out.toByteArray();
		} catch (final Exception ex) {
			throw new RuntimeException(ex);
		}
	}
}