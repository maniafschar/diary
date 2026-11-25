package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.math.BigInteger;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.jq.diary.entity.EventImage;
import com.jq.diary.repository.Repository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

@DataJpaTest
@Import(Repository.class)
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class EventImageDimensionRepositoryTest {
	@Autowired
	private EntityManagerFactory factory;
	@Autowired
	private Repository repository;

	@Test
	void queriesMissingDimensionsAndOnlyUpdatesUnchangedAttachments() {
		final EntityManager em = this.factory.createEntityManager();
		em.getTransaction().begin();
		final EventImage image = new EventImage();
		image.setImage("10000/1.png");
		image.setWidth(5);
		em.persist(image);
		em.getTransaction().commit();
		em.close();

		final String query = "from EventImage where (width is null or height is null) and id > ?1 order by id";
		assertEquals(image.getId(), this.repository.listFirst(query, EventImage.class, BigInteger.ZERO).get(0).getId());
		final String update = "update EventImage set width=?1, height=?2 where id=?3 and image=?4 and (width is null or height is null)";
		assertEquals(0, this.repository.executeUpdate(update, 37, 19, image.getId(), "old.png"));
		assertEquals(1, this.repository.executeUpdate(update, 37, 19, image.getId(), image.getImage()));
		assertEquals(0, this.repository.executeUpdate(update, 99, 99, image.getId(), image.getImage()));
		assertEquals(0, this.repository.listFirst(query, EventImage.class, BigInteger.ZERO).size());
		final EventImage saved = this.repository.one(EventImage.class, image.getId());
		assertEquals(37, saved.getWidth());
		assertEquals(19, saved.getHeight());
	}
}
