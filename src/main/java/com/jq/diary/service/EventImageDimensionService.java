package com.jq.diary.service;

import java.awt.Dimension;
import java.io.File;
import java.io.IOException;
import java.math.BigInteger;
import java.util.Iterator;
import java.util.List;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;

import org.bytedeco.javacv.FFmpegFrameGrabber;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.jq.diary.entity.EventImage;
import com.jq.diary.repository.Repository;
import com.jq.diary.repository.Repository.Attachment;

@Service
public class EventImageDimensionService {
	private static final Logger log = LoggerFactory.getLogger(EventImageDimensionService.class);
	private static final String PENDING = "from EventImage where (width is null or height is null) and id > ?1 order by id";
	private BigInteger lastId = BigInteger.ZERO;

	@Value("${app.event-image.dimension-enrichment-enabled:true}")
	private boolean enabled = true;

	@Autowired
	private Repository repository;

	@Scheduled(fixedDelay = 15000, initialDelay = 20000)
	void calculateDimensions() {
		if (!this.enabled)
			return;
		List<EventImage> pending = this.repository.listFirst(PENDING, EventImage.class, this.lastId);
		if (pending.isEmpty() && this.lastId.signum() != 0) {
			this.lastId = BigInteger.ZERO;
			pending = this.repository.listFirst(PENDING, EventImage.class, this.lastId);
		}
		if (pending.isEmpty())
			return;

		final EventImage image = pending.get(0);
		this.lastId = image.getId();
		try {
			if (image.getImage() == null)
				throw new IOException("Image attachment is missing");
			final Dimension dimensions = dimensions(new File(Attachment.fullPath(image.getImage())));
			this.repository.executeUpdate(
					"update EventImage set width=?1, height=?2 where id=?3 and image=?4 and (width is null or height is null)",
					dimensions.width, dimensions.height, image.getId(), image.getImage());
		} catch (final IOException | RuntimeException ex) {
			log.warn("Could not calculate dimensions for event image {}", image.getId(), ex);
		}
	}

	static Dimension dimensions(final File file) throws IOException {
		try (ImageInputStream input = ImageIO.createImageInputStream(file)) {
			if (input == null)
				throw new IOException("Could not open image attachment");
			final Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
			if (readers.hasNext()) {
				final ImageReader reader = readers.next();
				try {
					reader.setInput(input);
					return new Dimension(reader.getWidth(0), reader.getHeight(0));
				} finally {
					reader.dispose();
				}
			}
		}
		try (FFmpegFrameGrabber grabber = new FFmpegFrameGrabber(file)) {
			grabber.start();
			int width = grabber.getImageWidth();
			int height = grabber.getImageHeight();
			if (width <= 0 || height <= 0)
				throw new IOException("Media has no video dimensions");
			final int rotation = ((int) Math.round(grabber.getDisplayRotation()) % 360 + 360) % 360;
			if (rotation == 90 || rotation == 270) {
				final int originalWidth = width;
				width = height;
				height = originalWidth;
			}
			return new Dimension(width, height);
		}
	}
}
