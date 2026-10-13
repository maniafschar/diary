CREATE TABLE push_device (
	id BIGINT NOT NULL AUTO_INCREMENT,
	created_at TIMESTAMP NULL,
	modified_at TIMESTAMP NULL,
	contact_id BIGINT NOT NULL,
	token VARCHAR(128) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE KEY uq_push_device_token (token),
	CONSTRAINT fk_push_device_contact FOREIGN KEY (contact_id) REFERENCES contact (id)
);

CREATE TABLE push_delivery (
	id BIGINT NOT NULL AUTO_INCREMENT,
	created_at TIMESTAMP NULL,
	modified_at TIMESTAMP NULL,
	event_id BIGINT NOT NULL,
	device_id BIGINT NOT NULL,
	kind VARCHAR(32) NOT NULL,
	PRIMARY KEY (id),
	UNIQUE KEY uq_push_delivery_event_device_kind (event_id, device_id, kind),
	CONSTRAINT fk_push_delivery_device FOREIGN KEY (device_id) REFERENCES push_device (id)
);