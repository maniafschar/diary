package com.jq.diary;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class DiaryApplication {
	public static void main(final String[] args) {
		new SpringApplicationBuilder(DiaryApplication.class).run(args);
	}
}