package com.jq.diary.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.ManyToOne;

@Entity
public class ChatSummary extends BaseEntity {
	@ManyToOne
	private Contact contact;

	@Enumerated(EnumType.STRING)
	private Category category;

	@Column(columnDefinition = "BOOLEAN")
	private Boolean dirty;

	@Column(columnDefinition = "TEXT")
	private String note;

	public enum Category {
		CHAT("Zusammunfassung des bisherigen Gepsrächs",
				"Fasse die folgenden Tagebucheinträge knapp als persönlichen Hintergrund später für einen Chat zusammen, "
						+ "mit dem Du den Chat zielgerichteter führen kannst. Berücksichtige zeitliche Entwicklung, Orte, "
						+ "Beschreibungen und Bewertungen."),
		GUIDE("Handelt die Frage sich um aktuelle Ereignisse in der Umgebung, benutze dies",
				"Du bist ein Guide für die aktuelle Umgebung des Nutzers. Fasse aus den folgenden Tagebucheinträgen "
						+ "zusammen, welche Arten von Ereignissen und Aktivitäten der Nutzer mag, "
						+ "damit später mit diesem erzeugtn Input passende Vorschläge für seinen aktuelle Events und "
						+ "Nachrichten an seinem jetzigen Ort gemacht werden können."),
		PSYCHOLOGY("Möchte der Benutzer eine psychologische Reflexion, benutze dies",
				"Du bist ein einfühlsamer psychologischer Assistent. Analysiere die folgenden Tagebucheinträge "
						+ "reflexiv: wiederkehrende Themen, Stimmungen, Vorlieben, Belastungen und Entwicklungen über die Zeit. "
						+ "Formuliere Beobachtungen vorsichtig als Hypothesen, stelle keine Diagnosen und gib "
						+ "höchstens ein, zwei Reflexionsaussagen mit, so dass diese in künftigen Chats über dieses Thema "
						+ "mitberücksichtigt werden können."),
		TRAVEL("Möchte der Bentzer Vorschläge zu neuen Orten, die er besichtigen kann, benutze dies",
				"Du bist ein Tourenplaner. Fasse aus den folgenden Tagebucheinträgen zusammen, welche Orte, Regionen "
						+ "und Reiseformen der Nutzer bereits besucht hat, was ihm gefallen hat und welche "
						+ "Vorlieben sich daraus für die nächsten Reiseziele und der in Zukunft aktuellen Umgebung ableiten lassen.");

		private final String label;
		private final String prompt;

		Category(final String label, final String prompt) {
			this.label = label;
			this.prompt = prompt;
		}

		public String getLabel() {
			return this.label;
		}

		public String getPrompt() {
			return this.prompt;
		}
	}

	public Contact getContact() {
		return this.contact;
	}

	public void setContact(final Contact contact) {
		this.contact = contact;
	}

	public String getNote() {
		return this.note;
	}

	public void setNote(final String note) {
		this.note = note;
	}

	public Category getCategory() {
		return this.category;
	}

	public void setCategory(final Category category) {
		this.category = category;
	}

	public boolean isDirty() {
		return Boolean.TRUE.equals(this.dirty);
	}

	public void setDirty(final boolean dirty) {
		this.dirty = dirty;
	}
}
