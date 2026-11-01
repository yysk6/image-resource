package com.example.materialstudio.asset;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AssetService {
    static final long MAX_BYTES = 5L * 1024 * 1024;
    private static final Logger log = LoggerFactory.getLogger(AssetService.class);
    private final AssetMapper mapper;
    private final Path root;

    public AssetService(AssetMapper mapper, @Value("${app.storage-path}") String root) {
        this.mapper = mapper;
        this.root = Path.of(root).toAbsolutePath().normalize();
    }

    public AssetMapper.Asset upload(String userId, MultipartFile file) {
        if (file.isEmpty() || file.getSize() > MAX_BYTES) throw bad("图片不能为空，且不能超过 5 MB");
        byte[] bytes;
        try { bytes = file.getBytes(); } catch (IOException e) { throw bad("无法读取图片，请重新选择"); }
        String type = validateImage(bytes);
        if (!type.equals(file.getContentType())) throw bad("图片格式与文件内容不一致");
        String id = UUID.randomUUID().toString();
        String relative = id + (type.equals("image/png") ? ".png" : ".jpg");
        Path target = resolve(relative);
        String original = file.getOriginalFilename() == null ? "image" : file.getOriginalFilename().replace('\\', '/');
        original = original.substring(original.lastIndexOf('/') + 1);
        if (original.isBlank()) original = "image";
        if (original.length() > 255) original = original.substring(0, 255);
        try { Files.createDirectories(root); Files.write(target, bytes); }
        catch (IOException e) { tryDelete(target); throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "保存图片失败，请重试"); }
        var asset = new AssetMapper.Asset(id, userId, original, relative, type, bytes.length);
        try { mapper.insert(asset); }
        catch (RuntimeException e) { tryDelete(target); log.error("Failed to save asset metadata, assetId={}", id, e); throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "保存图片信息失败，请重试"); }
        return asset;
    }

    public byte[] content(String userId, String id) {
        var asset = owned(userId, id);
        try { return Files.readAllBytes(resolve(asset.storagePath())); }
        catch (IOException e) { throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "图片暂时无法读取"); }
    }

    public AssetMapper.Asset owned(String userId, String id) {
        var asset = mapper.findOwned(id, userId);
        if (asset == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "素材不存在");
        return asset;
    }

    private Path resolve(String relative) {
        Path target = root.resolve(relative).normalize();
        if (!target.getParent().equals(root)) throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "图片暂时无法读取");
        return target;
    }
    private void tryDelete(Path target) { try { Files.deleteIfExists(target); } catch (IOException e) { log.warn("Failed to clean up asset file", e); } }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }

    private static String validateImage(byte[] bytes) {
        try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) throw bad("只支持有效的 JPEG 或 PNG 图片");
            ImageReader reader = readers.next();
            try {
                reader.setInput(stream, true, true);
                String format = reader.getFormatName();
                String type = format.equalsIgnoreCase("png") ? "image/png" : format.equalsIgnoreCase("jpeg") ? "image/jpeg" : "";
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (type.isEmpty() || width < 1 || height < 1 || (long) width * height > 30_000_000L) throw bad("图片格式无效或尺寸过大");
                BufferedImage image = reader.read(0);
                if (image == null) throw bad("图片内容无效");
                return type;
            } finally { reader.dispose(); }
        } catch (IOException | IllegalArgumentException e) { throw bad("图片内容无效，请重新选择"); }
    }
}
