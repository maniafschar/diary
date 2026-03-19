package com.jq.diary.api;

import java.lang.reflect.Field;
import java.math.BigInteger;
import java.util.Base64;
import java.util.List;

import org.apache.commons.mail.EmailException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.reactive.function.client.WebClient;

import com.jq.diary.entity.BaseEntity;
import com.jq.diary.entity.Client;
import com.jq.diary.entity.Contact;
import com.jq.diary.entity.ContactEvent;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.EventFeedback;
import com.jq.diary.entity.EventImage;
import com.jq.diary.entity.Location;
import com.jq.diary.entity.Ticket;
import com.jq.diary.repository.Repository;
import com.jq.diary.repository.Repository.Attachment;
import com.jq.diary.service.AdminService;
import com.jq.diary.service.AuthenticationService;
import com.jq.diary.service.ContactService;
import com.jq.diary.service.EventService;
import com.jq.diary.service.FeedbackService;
import com.jq.diary.service.LocationService;
import com.jq.diary.util.Encryption;
import com.jq.diary.util.Json;

@RestController
@RequestMapping("api")
public class ApplicationApi {
	public static final int STATUS_PROCESSING_PDF = 566;

	@Autowired
	private ContactService contactService;

	@Autowired
	private EventService eventService;

	@Autowired
	private LocationService locationService;

	@Autowired
	private FeedbackService feedbackService;

	@Autowired
	private AuthenticationService authenticationService;

	@Autowired
	private Repository repository;

	@Autowired
	private AdminService adminService;

	@Value("${app.google.key}")
	private String googleKey;

	@GetMapping("authentication/login")
	public Contact authentication(final String email, @RequestHeader final String password,
			@RequestHeader final String salt) {
		return filter(
				this.authenticationService.login(Encryption.decryptBrowser(email), password, salt));
	}

	@GetMapping("authentication/token")
	public Contact authenticationToken(final String token, final String publicKey) {
		return this.authenticationService.token2User(publicKey, Encryption.decryptBrowser(token));
	}

	@DeleteMapping("authentication/token")
	public void authenticationTokenDelete(final String token) {
		this.authenticationService.tokenDelete(Encryption.decryptBrowser(token));
	}

	@PutMapping("authentication/token")
	public String authenticationTokenPut(@RequestHeader final BigInteger contactId, final String publicKey) {
		return this.authenticationService.tokenRefresh(this.repository.one(Contact.class, contactId), publicKey);
	}

	@PostMapping("authentication/create")
	public void authenticationCreatePost(@RequestBody final Client client) {
		this.authenticationService.createClient(client);
	}

	@PostMapping("authentication/verify")
	public void authenticationVerifyPost(final String token, final String password) {
		this.authenticationService.recoverVerifyEmail(Encryption.decryptBrowser(token),
				Encryption.decryptBrowser(password));
	}

	@GetMapping("authentication/verify")
	public String authenticationVerify(final String email) throws EmailException {
		return this.authenticationService.recoverSendEmail(Encryption.decryptBrowser(email));
	}

	@GetMapping("contact/{id}")
	public Contact contact(@PathVariable final BigInteger id) {
		return filter(this.contactService.one(id));
	}

	@PatchMapping("contact")
	public BigInteger contactPatch(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Contact contact) throws EmailException {
		if (contact.getId() == null) {
			contact.setClient(this.verifyContactClient(contactId, clientId).getClient());
			contact.setAdmin(true);
			this.contactService.save(contact);
			return contact.getId();
		}
		final Contact c = this.repository.one(Contact.class, contact.getId());
		if (contact.getEmail() != null)
			c.setEmail(contact.getEmail());
		if (contact.getName() != null)
			c.setName(contact.getName());
		if (contact.getImage() != null)
			c.setImage(contact.getImage());
		if (contact.getNote() != null)
			c.setNote(contact.getNote());
		this.contactService.save(c);
		return c.getId();
	}

	@GetMapping("contact")
	public List<Contact> contacts(@RequestHeader final BigInteger clientId) {
		return filter(this.contactService.list(this.repository.one(Client.class, clientId)));
	}

	@GetMapping("contact/event/{eventId}")
	public List<ContactEvent> contactEvent(@PathVariable final BigInteger eventId) {
		return filter(this.contactService.listEvent(eventId));
	}

	@PostMapping("contact/event/{contactId}/{eventId}")
	public BigInteger contactEventPost(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId, @PathVariable(name = "contactId") final BigInteger contactIdEvent,
			@PathVariable final BigInteger eventId) {
		final Contact contact = this.repository.one(Contact.class, contactIdEvent);
		if (this.verifyContactClient(contactId, clientId).getClient().getId().equals(contact.getClient().getId())) {
			final ContactEvent contactEvent = new ContactEvent();
			contactEvent.setContact(contact);
			contactEvent.setEvent(this.repository.one(Event.class, eventId));
			this.contactService.save(contactEvent);
			return contactEvent.getId();
		}
		throw new IllegalArgumentException("Client mismatch\ncontactId: " + contactId + "\nclientId: " + clientId
				+ "\nclient of event contact: " + contact.getClient().getId());
	}

	@DeleteMapping("contact/event/{contactEventId}")
	public void contactEventDelete(@PathVariable final BigInteger contactEventId) {
		this.contactService.delete(this.repository.one(ContactEvent.class, contactEventId));
	}

	@GetMapping("location/{id}")
	public Location location(@PathVariable final BigInteger id) {
		return filter(this.locationService.one(id));
	}

	@PutMapping("location")
	public BigInteger locationPut(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Location location) {
		if (location.getId() == null)
			location.setContact(this.verifyContactClient(contactId, clientId));
		else
			location.setContact(this.repository.one(Location.class, location.getId()).getContact());
		this.locationService.save(location);
		return location.getId();
	}

	@GetMapping("location")
	public List<Location> locations(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId) {
		return filter(
				this.locationService.list(this.verifyContactClient(contactId, clientId).getClient()));
	}

	@GetMapping("feedback/{id}")
	public EventFeedback feedback(@PathVariable final BigInteger id) {
		return filter(this.feedbackService.one(id));
	}

	@PostMapping("feedback/{eventId}")
	public BigInteger feedbackPost(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@RequestBody final EventFeedback feedback) throws EmailException {
		feedback.setContact(this.repository.one(Contact.class, contactId));
		feedback.setEvent(this.repository.one(Event.class, eventId));
		this.feedbackService.save(feedback);
		return feedback.getId();
	}

	@GetMapping("feedback")
	public List<EventFeedback> feedbacks(@RequestHeader final BigInteger contactId) {
		return filter(
				this.feedbackService.list(this.repository.one(Contact.class, contactId).getClient()));
	}

	@GetMapping("event")
	public List<Event> events(@RequestHeader final BigInteger clientId) {
		return filter(this.eventService.list(this.repository.one(Client.class, clientId)));
	}

	@GetMapping("event/{id}")
	public Event event(@PathVariable final BigInteger id) {
		return filter(this.eventService.one(id));
	}

	@DeleteMapping("event/{id}")
	public void eventDelete(@PathVariable final BigInteger id) {
		this.eventService.delete(id);
	}

	@GetMapping("event/contact/{contactId}")
	public List<Event> eventContact(@PathVariable final BigInteger contactId) {
		return filter(this.eventService.listContact(contactId));
	}

	@PostMapping("event")
	public BigInteger eventPost(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
			@RequestBody final Event event) {
		event.setContact(this.verifyContactClient(contactId, clientId));
		this.eventService.save(event);
		return event.getId();
	}

	@PostMapping("event/image/{eventId}/{type}")
	public BigInteger eventImagePost(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@PathVariable final String type, @RequestBody final EventImage eventImage) {
		eventImage.setEvent(this.repository.one(Event.class, eventId));
		eventImage.setImage(Attachment.createImage(type, Base64.getDecoder().decode(eventImage.getImage())));
		eventImage.setContact(this.repository.one(Contact.class, contactId));
		this.eventService.save(eventImage);
		return eventImage.getId();
	}

	@PutMapping("event/rating/{eventId}/{rating}")
	public BigInteger eventRatingPut(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@PathVariable final Double rating) {
		return this.eventService.putRating(eventId, contactId, rating).getId();
	}

	@DeleteMapping("event/image/{eventImageId}")
	public void eventImageDelete(@PathVariable final BigInteger eventImageId) {
		this.eventService.delete(this.repository.one(EventImage.class, eventImageId));
	}

	@PutMapping("event")
	public BigInteger eventPut(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId,
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

	@GetMapping("nearby")
	public String nearby(final String name, final double longitude, final double latitude) {
		final String value = WebClient.create("https://maps.googleapis.com/maps/api/place/textsearch/json?input=" + name
				+ "&locationRestriction={\"circle\":{\"center\":{\"latitude\":" + latitude + ",\"longitude\":"
				+ longitude + "},\"radius\":500.0\"}}&key=" + this.googleKey).get().retrieve().toEntity(String.class)
				.block().getBody();
		if (value != null && value.startsWith("{") && value.endsWith("}")) {
			Json.toNode(value);
		}
		return value;
	}

	@PostMapping("ticket")
	public void ticket(@RequestBody final Ticket ticket) {
		this.adminService.createTicket(ticket);
	}

	private Contact verifyContactClient(final BigInteger contactId, final BigInteger clientId) {
		final Contact contact = this.repository.one(Contact.class, contactId);
		if (contact.getClient().getId().equals(clientId))
			return contact;
		final List<Contact> list = this.repository.list(
				"from Contact where email='" + contact.getEmail() + "' and id<>" + contact.getId(), Contact.class);
		for (final Contact c : list) {
			if (c.getClient().getId().equals(clientId))
				return c;
		}
		throw new IllegalArgumentException(
				"Access to client " + clientId + " for user " + contactId + " " + contact.getName() + " rejected");
	}

	static <T> T filter(final T data) {
		if (data instanceof Contact) {
			((Contact) data).setEmail(null);
			((Contact) data).setLoginLink(null);
			((Contact) data).setPassword(null);
			((Contact) data).setPasswordReset(null);
		} else if (data instanceof List) {
			for (final Object element : (List<?>) data)
				ApplicationApi.filter(element);
		} else if (data != null) {
			for (final Field field : data.getClass().getDeclaredFields()) {
				if (BaseEntity.class.equals(field.getType().getGenericSuperclass())) {
					field.setAccessible(true);
					try {
						ApplicationApi.filter(field.get(data));
					} catch (final Exception e) {
						throw new RuntimeException(e);
					}
				}
			}
		}
		return data;
	}
}