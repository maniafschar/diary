package com.jq.diary.api;

import java.math.BigInteger;
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

import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Event;
import com.jq.diary.entity.EventFeedback;
import com.jq.diary.service.FeedbackService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/feedback")
public class FeedbackApi extends ApplicationApi {
	@Autowired
	private FeedbackService feedbackService;

	@GetMapping("{id}")
	public EventFeedback get(@PathVariable final BigInteger id) {
		return Utilities.filter(this.feedbackService.one(id));
	}

	@PostMapping("{eventId}")
	public BigInteger post(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventId,
			@RequestBody final EventFeedback feedback) throws EmailException {
		feedback.setContact(this.repository.one(Contact.class, contactId));
		feedback.setEvent(this.repository.one(Event.class, eventId));
		this.feedbackService.save(feedback);
		return feedback.getId();
	}

	@PutMapping("{eventFeedbackId}")
	public void put(@RequestHeader final BigInteger contactId, @PathVariable final BigInteger eventFeedbackId,
			@RequestBody final EventFeedback feedback) throws EmailException {
		final EventFeedback f = this.repository.one(EventFeedback.class, eventFeedbackId);
		f.setNote(feedback.getNote());
		this.feedbackService.save(f);
	}

	@DeleteMapping("{eventFeedbackId}")
	public void delete(@RequestHeader final BigInteger contactId,
			@PathVariable final BigInteger eventFeedbackId) throws EmailException {
		this.feedbackService.delete(eventFeedbackId);
	}

	@GetMapping("list")
	public List<EventFeedback> getList(@RequestHeader final BigInteger contactId) {
		return Utilities.filter(
				this.feedbackService.list(this.repository.one(Contact.class, contactId).getClient()));
	}
}