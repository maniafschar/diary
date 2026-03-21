package com.jq.diary.service;

import java.math.BigInteger;
import java.util.List;

import org.apache.commons.mail.EmailException;
import org.apache.logging.log4j.util.Strings;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.jq.diary.entity.Client;
import com.jq.diary.entity.EventFeedback;
import com.jq.diary.repository.Repository;

@Service
public class FeedbackService {
	@Autowired
	private Repository repository;

	@Value("${app.url}")
	private String url;

	public void save(final EventFeedback feedback) throws EmailException {
		if (!Strings.isEmpty(feedback.getNote()))
			this.repository.save(feedback);
	}

	public EventFeedback one(final BigInteger id) {
		return this.repository.one(EventFeedback.class, id);
	}

	public void delete(final BigInteger id) {
		this.repository.delete(this.repository.one(EventFeedback.class, id));
	}

	public List<EventFeedback> list(final Client client) {
		return this.repository.list(
				"from Feedback feedback, Contact contact where feedback.contactId=contact.id and contact.clientId="
						+ client.getId() + " ORDER BY createdAt DESC",
				EventFeedback.class);
	}
}
