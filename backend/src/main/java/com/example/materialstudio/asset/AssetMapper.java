package com.example.materialstudio.asset;

import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface AssetMapper {
    record Asset(String id, String userId, String originalName, String storagePath, String mimeType, long sizeBytes) {}

    @Insert("INSERT INTO asset (id, user_id, original_name, storage_path, mime_type, size_bytes) VALUES (#{id}, #{userId}, #{originalName}, #{storagePath}, #{mimeType}, #{sizeBytes})")
    void insert(Asset asset);

    @Select("SELECT id, user_id, original_name, storage_path, mime_type, size_bytes FROM asset WHERE id = #{id} AND user_id = #{userId}")
    Asset findOwned(@Param("id") String id, @Param("userId") String userId);
}
