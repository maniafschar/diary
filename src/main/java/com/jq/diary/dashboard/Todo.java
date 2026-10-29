package com.jq.diary.dashboard;

import com.jq.diary.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;

@Entity
public class Todo extends BaseEntity {
	@Column(nullable = false, length = 200)
	private String note;

	@Column(nullable = false)
	private boolean completed;

	public String getNote() {
		return this.note;
	}

	public void setNote(final String note) {
		this.note = note;
	}

	public boolean isCompleted() {
		return this.completed;
	}

	public void setCompleted(final boolean completed) {
		this.completed = completed;
	}
}
