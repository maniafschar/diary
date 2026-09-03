package com.jq.diary.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
public class PdfService {
	@Autowired
	private ChartService chartService;

	@Autowired
	private WordCloudService wordCloudService;

	@Autowired
	private AiService aiService;

	@Autowired
	private AdminService adminService;

	@Async
	public void create() {
	}
}