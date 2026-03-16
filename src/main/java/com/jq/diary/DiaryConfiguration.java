package com.jq.diary;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class DiaryConfiguration implements AsyncConfigurer {
	private static final String[] allowedOrigins = {
			"http://localhost:9000",
			"https://diary.cafe"
	};

	@Bean
	public WebMvcConfigurer corsConfigurer() {
		return new WebMvcConfigurer() {
			@Override
			public void addCorsMappings(final CorsRegistry registry) {
				registry.addMapping("/**").allowedOriginPatterns(allowedOrigins)
						.allowedHeaders("content-type", "x-requested-with", "clientId", "contactId", "salt", "password",
								"secret")
						.exposedHeaders("content-disposition")
						.allowedMethods("GET", "PUT", "POST", "OPTIONS", "DELETE", "PATCH");
			}
		};
	}
}