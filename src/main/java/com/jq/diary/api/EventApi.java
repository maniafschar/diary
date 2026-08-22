package com.jq.diary.api;

import java.io.IOException;
import java.math.BigInteger;
import java.util.List;

import org.apache.commons.mail.EmailException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.EventFeedback;
import com.jq.diary.entity.EventImage;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository.Attachment;
import com.jq.diary.service.EventService;
import com.jq.diary.service.ExternalService;
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

	@PostMapping("exists")
	public boolean postExists(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		event.setContact(this.verifyContactClient(contactId, clientId));
		event.getLocation().setContact(event.getContact());
		return this.locationService.find(event.getLocation()) != null && this.eventService.exists(event);
	}

	@PostMapping
	public BigInteger post(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		final Double rating = event.getRating();
		event.setContact(this.verifyContactClient(contactId, clientId));
		event.getLocation().setContact(event.getContact());
		final Location storedLocation = this.locationService.find(event.getLocation());
		if (storedLocation == null)
			this.locationService.save(event.getLocation());
		else
			event.setLocation(storedLocation);
		this.eventService.save(event);
		if (rating != null)
			this.eventService.putRating(event.getId(), contactId, rating);
		return event.getId();
	}

	@PatchMapping
	public void patch(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		this.verifyContactClient(contactId, clientId);
		final Event original = this.eventService.one(event.getId());
		original.setNote(event.getNote());
		original.setDate(event.getDate());
		original.setLocation(this.locationService.one(event.getLocation().getId()));
		this.eventService.save(original);
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

	@PostMapping(path = "image/{eventId}/{type}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public BigInteger postImage(@PathVariable final BigInteger eventId,
			@PathVariable final String type, @RequestParam("file") final MultipartFile file) throws IOException {
		final EventImage eventImage = new EventImage();
		eventImage.setEvent(this.repository.one(Event.class, eventId));
		eventImage.setImage(Attachment.createImage(type, file.getBytes()));
		this.eventService.save(eventImage);
		return eventImage.getId();
	}

	@DeleteMapping("image/{eventImageId}")
	public void deleteImage(@PathVariable final BigInteger eventImageId) {
		this.eventService.delete(this.repository.one(EventImage.class, eventImageId));
	}
}
