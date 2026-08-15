package com.jq.diary.api;

import java.math.BigInteger;
import java.util.Base64;
import java.util.List;
import java.util.Map;

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

import com.jq.diary.api.model.NewEvent;
import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.EventFeedback;
import com.jq.diary.entity.EventImage;
import com.jq.diary.repository.Repository.Attachment;
import com.jq.diary.service.EventService;
import com.jq.diary.service.ExternalService;
import com.jq.diary.service.ExternalService.Response;
import com.jq.diary.service.LocationService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/event")
public class EventApi extends ApplicationApi {
	@Autowired
	private EventService eventService;

	@Autowired
	private LocationService locationService;

	@Autowired
	private ExternalService externalService;

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
		this.eventService.delete(this.repository.one(Event.class, id));
	}

	@GetMapping("contact/{contactId}")
	public List<Event> getContact(@PathVariable final BigInteger contactId) {
		return Utilities.filter(this.eventService.listContact(contactId));
	}

	@PostMapping
	public BigInteger post(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final NewEvent newEvent) {
		final Event event = newEvent.getEvent();
		final Double rating = event.getRating();
		event.setContact(this.verifyContactClient(contactId, clientId));
		newEvent.getLocation().setContact(event.getContact());
		this.locationService.save(newEvent.getLocation());
		event.setLocation(newEvent.getLocation());
		this.eventService.save(event);
		if (rating != null)
			this.eventService.putRating(event.getId(), contactId, rating);
		for (final EventImage eventImage : event.getEventImages()) {
			eventImage.setEvent(event);
			eventImage.setImage(Attachment.createImage("jpg", Base64.getDecoder().decode(eventImage.getImage())));
			this.eventService.save(eventImage);
		}
		return event.getId();
	}

	@PutMapping("rating/{eventId}/{rating}")
	public BigInteger putRating(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@PathVariable final Double rating) {
		return this.eventService.putRating(eventId, contactId, rating).getId();
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
		if (contactId.equals(f.getContact().getId())) {
			f.setNote(feedback.getNote());
			this.eventService.saveFeedback(f);
		}
	}

	@DeleteMapping("feedback/{eventFeedbackId}")
	public void deleteFeedback(@RequestHeader final BigInteger contactId,
			@PathVariable final BigInteger eventFeedbackId) throws EmailException {
		this.eventService.deleteFeedback(eventFeedbackId);
	}

	@PostMapping("image/{eventId}/{type}")
	public BigInteger postImage(@PathVariable final BigInteger eventId,
			@PathVariable final String type, @RequestBody final EventImage eventImage) {
		eventImage.setEvent(this.repository.one(Event.class, eventId));
		eventImage.setImage(Attachment.createImage(type, Base64.getDecoder().decode(eventImage.getImage())));
		this.eventService.save(eventImage);
		return eventImage.getId();
	}

	@DeleteMapping("image/{eventImageId}")
	public void deleteImage(@PathVariable final BigInteger eventImageId) {
		this.eventService.delete(this.repository.one(EventImage.class, eventImageId));
	}

	@GetMapping("location/address")
	public Response getAddress(final double latitude, final double longitude) {
		return this.externalService.address(latitude, longitude);
	}

	@GetMapping("location/nearby")
	public Map<String, Object> getNearby(final double latitude, final double longitude) {
		return this.externalService.nearby(latitude, longitude);
	}
}
