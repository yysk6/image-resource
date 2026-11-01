package com.example.materialstudio.catalog;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface CatalogMapper {
    record DemoUser(String id, String displayName) {}
    record TemplateRow(String id, String title, String category, String description, String coverUrl,
                       int requiredImageCount, String acceptedMimeTypes, long maxFileSizeBytes) {}

    @Select("SELECT id, display_name FROM demo_user ORDER BY id")
    List<DemoUser> users();

    @Select("SELECT id, display_name FROM demo_user WHERE id = #{id}")
    DemoUser user(@Param("id") String id);

    @Select("SELECT category FROM template GROUP BY category ORDER BY MIN(sort_order), category")
    List<String> categories();

    @Select("<script>SELECT id, title, category, description, cover_url, required_image_count, accepted_mime_types, max_file_size_bytes FROM template <where><if test='category != null'>category = #{category}</if></where> ORDER BY sort_order, id</script>")
    List<TemplateRow> templates(@Param("category") String category);

    @Select("SELECT id, title, category, description, cover_url, required_image_count, accepted_mime_types, max_file_size_bytes FROM template WHERE id = #{id}")
    TemplateRow template(@Param("id") String id);
}
