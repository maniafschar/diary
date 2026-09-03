package com.jq.diary.api;

import java.io.IOException;
import java.math.BigInteger;
import java.util.ArrayList;
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

import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.EventFeedback;
import com.jq.diary.entity.EventImage;
import com.jq.diary.entity.EventRating;
import com.jq.diary.entity.Location;
import com.jq.diary.repository.Repository.Attachment;
import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.EventService;
import com.jq.diary.service.LocationService;
import com.jq.diary.service.PdfService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/event")
public class EventApi extends ApplicationApi {
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private EventService eventService;

	@Autowired
	private PdfService pdfService;

	@Autowired
	private LocationService locationService;

	@GetMapping("list")
	public List<Event> getList(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId) {
		return this.filter(
				this.eventService.list(this.authorizationService.requireContact(contactId, clientId).getClient()));
	}

	@GetMapping("{id}")
	public Event get(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger id) {
		return Utilities.filter(this.authorizationService.requireEvent(id, contactId));
	}

	@DeleteMapping("{id}")
	public void delete(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger id) {
		this.eventService.delete(this.authorizationService.requireEvent(id, contactId));
	}

	@GetMapping("contact/{contactId}")
	public List<Event> getContact(@PathVariable final BigInteger contactId, @RequestHeader final BigInteger clientId) {
		return Utilities.filter(
				this.eventService
						.listContact(this.authorizationService.requireContact(contactId, clientId).getId()));
	}

	@PostMapping("exists")
	public boolean postExists(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		event.setContact(this.authorizationService.requireContact(contactId, clientId));
		event.getLocation().setContact(event.getContact());
		return this.locationService.find(event.getLocation()) != null && this.eventService.exists(event);
	}

	@PostMapping
	public BigInteger post(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		final Double rating = event.getRating();
		event.setContact(this.authorizationService.requireContact(contactId, clientId));
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
	public void patch(@RequestHeader final BigInteger contactId, @RequestBody final Event event) {
		final Event original = this.authorizationService.requireEvent(event.getId(), contactId);
		original.setNote(event.getNote());
		original.setDate(event.getDate());
		original.setLocation(this.locationService.one(event.getLocation().getId()));
		this.eventService.save(original);
	}

	@PutMapping("rating/{eventId}/{rating}")
	public BigInteger putRating(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@PathVariable final Double rating) {
		this.authorizationService.requireEvent(eventId, contactId);
		return this.eventService.putRating(eventId, contactId, rating).getId();
	}

	@PutMapping
	public BigInteger put(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		if (event.getId() != null) {
			final Contact contact = this.authorizationService.requireEvent(event.getId(), contactId).getContact();
			if (contact.getId().equals(this.authorizationService.requireContact(contactId, clientId).getId())) {
				event.setContact(contact);
				this.eventService.save(event);
			}
		}
		return event.getId();
	}

	@PostMapping("feedback/{eventId}")
	public BigInteger postFeedback(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@PathVariable final BigInteger eventId, @RequestBody final EventFeedback feedback) throws EmailException {
		feedback.setContact(this.authorizationService.requireContact(contactId, clientId));
		feedback.setEvent(this.authorizationService.requireEvent(eventId, feedback.getContact().getId()));
		this.eventService.saveFeedback(feedback);
		return feedback.getId();
	}

	@PutMapping("feedback/{eventFeedbackId}")
	public void putFeedback(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@PathVariable final BigInteger eventFeedbackId,
			@RequestBody final EventFeedback feedback) throws EmailException {
		final EventFeedback f = this.repository.one(EventFeedback.class, eventFeedbackId);
		if (this.authorizationService.requireContact(contactId, clientId).getId().equals(f.getContact().getId())) {
			f.setNote(feedback.getNote());
			this.eventService.saveFeedback(f);
		}
	}

	@DeleteMapping("feedback/{eventFeedbackId}")
	public void deleteFeedback(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@PathVariable final BigInteger eventFeedbackId) throws EmailException {
		final Contact contact = this.authorizationService.requireContact(contactId, clientId);
		final EventFeedback eventFeedback = this.repository.one(EventFeedback.class, eventFeedbackId);
		if (contact.getId().equals(eventFeedback.getContact().getId()))
			this.eventService.deleteFeedback(eventFeedback);
	}

	@PostMapping(path = "image/{eventId}/{type}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public BigInteger postImage(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@PathVariable final BigInteger eventId, @PathVariable final String type,
			@RequestParam("file") final MultipartFile file) throws IOException {
		final EventImage eventImage = new EventImage();
		eventImage.setContact(this.authorizationService.requireContact(contactId, clientId));
		eventImage.setEvent(this.authorizationService.requireEvent(eventId,
				this.authorizationService.requireContact(contactId, clientId).getId()));
		eventImage.setImage(Attachment.createImage(type, file.getBytes()));
		this.eventService.save(eventImage);
		return eventImage.getId();
	}

	@DeleteMapping("image/{eventImageId}")
	public void deleteImage(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@PathVariable final BigInteger eventImageId) {
		final EventImage eventImage = this.repository.one(EventImage.class, eventImageId);
		if (this.authorizationService.requireContact(contactId, clientId).getId()
				.equals(eventImage.getContact().getId()))
			this.eventService.delete(eventImage);
	}

	@PostMapping(path = "pdf")
	public void postPdf(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final List<BigInteger> eventIds) throws IOException {
		this.pdfService.create();
	}

	private List<Event> filter(final List<Event> list) {
		final List<Event> filtered = new ArrayList<>();
		for (final Event event : list) {
			final Event filteredEvent = new Event();
			filteredEvent.setDate(event.getDate());
			filteredEvent.setId(event.getId());
			filteredEvent.setNote(event.getNote());
			filteredEvent.setRating(event.getRating());
			filteredEvent.setRatingCount(event.getRatingCount());

			filteredEvent.setContact(new Contact());
			filteredEvent.getContact().setId(event.getContact().getId());
			filteredEvent.getContact().setName(event.getContact().getName());

			filteredEvent.setLocation(new Location());
			filteredEvent.getLocation().setId(event.getLocation().getId());
			filteredEvent.getLocation().setAddress(event.getLocation().getAddress());
			filteredEvent.getLocation().setAltitude(event.getLocation().getAltitude());
			filteredEvent.getLocation().setLatitude(event.getLocation().getLatitude());
			filteredEvent.getLocation().setLongitude(event.getLocation().getLongitude());
			filteredEvent.getLocation().setName(event.getLocation().getName());

			if (event.getEventImages() != null) {
				filteredEvent.setEventImages(new ArrayList<EventImage>());
				for (final EventImage eventImage : event.getEventImages()) {
					final EventImage filteredEventImage = new EventImage();
					filteredEventImage.setId(eventImage.getId());
					filteredEventImage.setImage(eventImage.getImage());
					filteredEventImage.setImageThumbnail(eventImage.getImageThumbnail());
					filteredEvent.getEventImages().add(filteredEventImage);
				}
			}

			if (event.getEventRatings() != null) {
				filteredEvent.setEventRatings(new ArrayList<EventRating>());
				for (final EventRating eventRating : event.getEventRatings()) {
					final EventRating filteredEventRating = new EventRating();
					filteredEventRating.setId(eventRating.getId());
					filteredEventRating.setRating(eventRating.getRating());
					filteredEventRating.setContact(new Contact());
					filteredEventRating.getContact().setId(eventRating.getContact().getId());
					filteredEventRating.getContact().setName(eventRating.getContact().getName());
					filteredEvent.getEventRatings().add(filteredEventRating);
				}
			}

			if (event.getContactEvents() != null) {
				filteredEvent.setContactEvents(new ArrayList<ContactEvent>());
				for (final ContactEvent contactEvent : event.getContactEvents()) {
					final ContactEvent filteredContactEvent = new ContactEvent();
					filteredContactEvent.setId(contactEvent.getId());
					filteredContactEvent.setContact(new Contact());
					filteredContactEvent.getContact().setId(contactEvent.getContact().getId());
					filteredContactEvent.getContact().setName(contactEvent.getContact().getName());
					filteredEvent.getContactEvents().add(filteredContactEvent);
				}
			}

			filtered.add(filteredEvent);
		}
		return filtered;
	}
}
