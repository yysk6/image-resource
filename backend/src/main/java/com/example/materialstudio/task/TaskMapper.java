package com.example.materialstudio.task;

import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.annotations.*;

@Mapper
public interface TaskMapper {
    record Task(String id, String userId, String templateId, String templateTitle, String status, String currentStage,
                String resultUrl, String failureReason, LocalDateTime createdAt, LocalDateTime startedAt, LocalDateTime finishedAt) {}
    @Insert("INSERT INTO creation_task(id,user_id,template_id,status) VALUES(#{id},#{userId},#{templateId},'PENDING')")
    void insert(@Param("id") String id, @Param("userId") String userId, @Param("templateId") String templateId);
    @Insert("INSERT INTO task_asset(task_id,asset_id,position) VALUES(#{taskId},#{assetId},#{position})")
    void link(@Param("taskId") String taskId, @Param("assetId") String assetId, @Param("position") int position);
    @Select("SELECT t.id,t.user_id,t.template_id,p.title,t.status,t.current_stage,t.result_url,t.failure_reason,t.created_at,t.started_at,t.finished_at FROM creation_task t JOIN template p ON p.id=t.template_id WHERE t.id=#{id} AND t.user_id=#{userId}")
    Task findOwned(@Param("id") String id, @Param("userId") String userId);
    @Select("SELECT t.id,t.user_id,t.template_id,p.title,t.status,t.current_stage,t.result_url,t.failure_reason,t.created_at,t.started_at,t.finished_at FROM creation_task t JOIN template p ON p.id=t.template_id WHERE t.user_id=#{userId} ORDER BY t.created_at DESC,t.id DESC")
    List<Task> findAllOwned(@Param("userId") String userId);
    @Select("SELECT asset_id FROM task_asset WHERE task_id=#{id} ORDER BY position")
    List<String> assetIds(@Param("id") String id);
    @Update("UPDATE creation_task SET status='RUNNING',started_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3) WHERE id=#{id} AND status='PENDING'")
    int start(@Param("id") String id);
    @Update("UPDATE creation_task SET current_stage=#{stage},updated_at=UTC_TIMESTAMP(3) WHERE id=#{id} AND status='RUNNING'")
    int stage(@Param("id") String id, @Param("stage") String stage);
    @Update("UPDATE creation_task SET status='SUCCEEDED',result_url=#{url},finished_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3) WHERE id=#{id} AND status='RUNNING'")
    int succeed(@Param("id") String id, @Param("url") String url);
    @Update("UPDATE creation_task SET status='FAILED',failure_reason=#{reason},finished_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3) WHERE id=#{id} AND status='RUNNING'")
    int fail(@Param("id") String id, @Param("reason") String reason);
    @Update("UPDATE creation_task SET status='FAILED',failure_reason=#{reason},finished_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3) WHERE id=#{id} AND status='PENDING'")
    int reject(@Param("id") String id, @Param("reason") String reason);
    @Update("UPDATE creation_task SET status='FAILED',failure_reason=#{reason},finished_at=UTC_TIMESTAMP(3),updated_at=UTC_TIMESTAMP(3) WHERE id=#{id} AND status IN ('PENDING','RUNNING')")
    int failStart(@Param("id") String id, @Param("reason") String reason);
}
