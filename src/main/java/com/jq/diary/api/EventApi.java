package com.jq.diary.api;

import java.math.BigInteger;
import java.util.Base64;
import java.util.List;

import org.apache.commons.mail.EmailException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.EventFeedback;
import com.jq.diary.entity.EventImage;
import com.jq.diary.repository.Repository.Attachment;
import com.jq.diary.service.EventService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/event")
public class EventApi extends ApplicationApi {
	@Autowired
	private EventService eventService;

	@GetMapping("list")
	public List<Event> getList(@RequestHeader final BigInteger clientId) {
		return Utilities.filter(this.eventService.list(this.repository.one(Client.class, clientId)));
	}

	@GetMapping("{id}")
	public Event get(@PathVariable final BigInteger id) {
		return Utilities.filter(this.eventService.one(id));
	}

	@DeleteMapping("{id}")
	public void delete(@PathVariable final BigInteger id) {
		this.eventService.delete(id);
	}

	@GetMapping("contact/{contactId}")
	public List<Event> getContact(@PathVariable final BigInteger contactId) {
		return Utilities.filter(this.eventService.listContact(contactId));
	}

	@PostMapping
	public BigInteger post(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		event.setContact(this.verifyContactClient(contactId, clientId));
		this.eventService.save(event);
		return event.getId();
	}

	@PostMapping("image/{eventId}/{type}")
	public BigInteger postImage(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@PathVariable final String type, @RequestBody final EventImage eventImage) {
		eventImage.setEvent(this.repository.one(Event.class, eventId));
		eventImage.setImage(Attachment.createImage(type, Base64.getDecoder().decode(eventImage.getImage())));
		eventImage.setContact(this.repository.one(Contact.class, contactId));
		this.eventService.save(eventImage);
		return eventImage.getId();
	}

	@PutMapping("rating/{eventId}/{rating}")
	public BigInteger putRating(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@PathVariable final Double rating) {
		return this.eventService.putRating(eventId, contactId, rating).getId();
	}

	@DeleteMapping("image/{eventImageId}")
	public void deleteImage(@PathVariable final BigInteger eventImageId) {
		this.eventService.delete(this.repository.one(EventImage.class, eventImageId));
	}

	@PutMapping
	public BigInteger put(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		if (event.getId() != null) {
			final Contact contact = this.repository.one(Event.class, event.getId()).getContact();
			if (contact.getId().equals(this.verifyContactClient(contactId, clientId).getId())) {
				event.setContact(contact);
				this.eventService.save(event);
			}
		}
		return event.getId();
	}

	@PostMapping("feedback/{eventId}")
	public BigInteger postFeedback(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@RequestBody final EventFeedback feedback) throws EmailException {
		feedback.setContact(this.repository.one(Contact.class, contactId));
		feedback.setEvent(this.repository.one(Event.class, eventId));
		this.eventService.saveFeedback(feedback);
		return feedback.getId();
	}

	@PutMapping("feedback/{eventFeedbackId}")
	public void putFeedback(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventFeedbackId,
			@RequestBody final EventFeedback feedback) throws EmailException {
		final EventFeedback f = this.repository.one(EventFeedback.class, eventFeedbackId);
		f.setNote(feedback.getNote());
		this.eventService.saveFeedback(f);
	}

	@DeleteMapping("feedback/{eventFeedbackId}")
	public void deleteFeedback(@RequestHeader final BigInteger contactId,
			@PathVariable final BigInteger eventFeedbackId) throws EmailException {
		this.eventService.delete(eventFeedbackId);
	}
}