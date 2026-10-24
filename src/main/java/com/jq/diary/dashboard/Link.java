package com.jq.diary.dashboard;

import com.jq.diary.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Link extends BaseEntity {
	@Column(nullable = false, length = 200)
	private String title;

	@Column(nullable = false, length = 2048)
	private String url;

	@Column(length = 500)
	private String remark;

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

	public String getRemark() {
		return this.remark;
	}

	public void setRemark(final String remark) {
		this.remark = remark;
	}
}
