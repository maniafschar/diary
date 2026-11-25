package com.jq.diary.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.awt.Dimension;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Path;
import java.util.List;

import javax.imageio.ImageIO;

import org.bytedeco.javacv.FFmpegFrameRecorder;
import org.bytedeco.javacv.Java2DFrameConverter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.MockedStatic;
import org.springframework.test.util.ReflectionTestUtils;

import com.jq.diary.entity.EventImage;
import com.jq.diary.repository.Repository;
import com.jq.diary.repository.Repository.Attachment;

class EventImageDimensionServiceTest {
	private static final String PENDING = "from EventImage where (width is null or height is null) and id > ?1 order by id";

	@TempDir
	Path temp;

	@Test
	void readsOriginalImageDimensionsAndReportsMissingFile() throws IOException {
		final Path image = this.temp.resolve("image.png");
		ImageIO.write(new BufferedImage(37, 19, BufferedImage.TYPE_INT_RGB), "png", image.toFile());
		assertEquals(new Dimension(37, 19), EventImageDimensionService.dimensions(image.toFile()));
		assertThrows(IOException.class, () -> EventImageDimensionService.dimensions(this.temp.resolve("missing.png").toFile()));
	}

	@Test
	void readsRotatedVideoDimensions() throws IOException {
		final Path video = this.temp.resolve("video.mp4");
		try (FFmpegFrameRecorder recorder = new FFmpegFrameRecorder(video.toFile(), 40, 20);
				Java2DFrameConverter converter = new Java2DFrameConverter()) {
			recorder.setVideoCodec(org.bytedeco.ffmpeg.global.avcodec.AV_CODEC_ID_MPEG4);
			recorder.setDisplayRotation(90);
			recorder.start();
			recorder.record(converter.convert(new BufferedImage(40, 20, BufferedImage.TYPE_INT_RGB)));
			recorder.stop();
		}
		assertEquals(new Dimension(20, 40), EventImageDimensionService.dimensions(video.toFile()));
	}

	@Test
	void skipsFailuresContinuesAndRetriesFromBeginning() throws IOException {
		final Repository repository = mock(Repository.class);
		final EventImageDimensionService service = new EventImageDimensionService();
		ReflectionTestUtils.setField(service, "repository", repository);
		final EventImage broken = new EventImage();
		broken.setId(BigInteger.ONE);
		final EventImage valid = new EventImage();
		valid.setId(BigInteger.TWO);
		valid.setImage("valid.png");
		valid.setWidth(9);
		final Path image = this.temp.resolve("valid.png");
		ImageIO.write(new BufferedImage(37, 19, BufferedImage.TYPE_INT_RGB), "png", image.toFile());
		when(repository.listFirst(PENDING, EventImage.class, BigInteger.ZERO)).thenReturn(List.of(broken));
		when(repository.listFirst(PENDING, EventImage.class, BigInteger.ONE)).thenReturn(List.of(valid));
		when(repository.listFirst(PENDING, EventImage.class, BigInteger.TWO)).thenReturn(List.of());

		try (MockedStatic<Attachment> attachment = mockStatic(Attachment.class)) {
			attachment.when(() -> Attachment.fullPath("valid.png")).thenReturn(image.toString());
			service.calculateDimensions();
			service.calculateDimensions();
			service.calculateDimensions();
		}

		verify(repository).executeUpdate(
				"update EventImage set width=?1, height=?2 where id=?3 and image=?4 and (width is null or height is null)",
				37, 19, BigInteger.TWO, "valid.png");
		verify(repository, org.mockito.Mockito.times(2)).listFirst(PENDING, EventImage.class, BigInteger.ZERO);
	}

	@Test
	void disabledJobDoesNotQuery() {
		final Repository repository = mock(Repository.class);
		final EventImageDimensionService service = new EventImageDimensionService();
		ReflectionTestUtils.setField(service, "repository", repository);
		ReflectionTestUtils.setField(service, "enabled", false);
		service.calculateDimensions();
		org.mockito.Mockito.verify(repository, org.mockito.Mockito.never()).listFirst(any(), any(), any());
	}
}
