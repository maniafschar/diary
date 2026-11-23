ALTER TABLE event ADD COLUMN hashtags TEXT NULL;

CREATE TABLE user_hashtag (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(6) NULL,
    modified_at DATETIME(6) NULL,
    contact_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    INDEX user_hashtag_contact_idx (contact_id),
    CONSTRAINT user_hashtag_contact_fk FOREIGN KEY (contact_id) REFERENCES contact (id)
);
