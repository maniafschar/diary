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
import com.jq.diary.entity.Location;
import com.jq.diary.service.AuthorizationService;
import com.jq.diary.service.ExternalService;
import com.jq.diary.service.WordCloudService;
import com.jq.diary.util.Utilities;

@RestController
@RequestMapping("api/statistics")
public class StatisticsApi extends ApplicationApi {
	@Autowired
	private AuthorizationService authorizationService;

	@Autowired
	private WordCloudService wordCloudService;

	@GetMapping
	public void get(@RequestHeader final BigInteger contactId,
			@RequestHeader final BigInteger clientId) {
        this.authorizationService.requireContact(contactId, clientId);
    }
}