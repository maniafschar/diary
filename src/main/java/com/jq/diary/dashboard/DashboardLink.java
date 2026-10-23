package com.jq.diary.dashboard;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

import com.jq.diary.entity.BaseEntity;

@Entity
public class DashboardLink extends BaseEntity {
	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, length = 2048)
	private String url;

	public String getTitle() {
		return this.title;
	}

	public void setTitle(final String title) {
		this.title = title;
	}

	public String getUrl() {
		return this.url;
	}

	public void setUrl(final String url) {
		this.url = url;
	}
}
