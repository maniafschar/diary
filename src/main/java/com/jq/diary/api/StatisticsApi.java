package com.jq.diary.api;

import java.math.BigInteger;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.jq.diary.entity.Contact;
import com.jq.diary.entity.Event;
import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.EventService;
import com.jq.diary.service.WordCloudService;
import com.jq.diary.service.WordCloudService.Token;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/statistics")
public class StatisticsApi extends ApplicationApi {
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private EventService eventService;

	@Autowired
	private WordCloudService wordCloudService;

	@GetMapping("wordcloud")
	public byte[] getWordcloud(@RequestHeader final BigInteger contactId, @RequestHeader final BigInteger clientId) {
		final List<Event> events = eventService.list(this.authorizationService.requireContact(contactId, clientId).getClient());
		final StringBuilder text = new StringBuilder();
		events.forEach(e -> {
			if (e.getNote() != null)
				text.append(e.getNote() + " ");
		});
		final List<Token> token = this.wordCloudService.extract(text.toString());
		while (token.size() > 50)
			token.remove(50);
		return this.wordCloudService.createImage(token);
    }
}
