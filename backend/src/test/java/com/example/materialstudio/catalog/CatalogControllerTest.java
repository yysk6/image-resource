package com.example.materialstudio.catalog;

import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CatalogControllerTest {
    private final CatalogMapper mapper = mock(CatalogMapper.class);
    private MockMvc mvc;
    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new CatalogController(mapper), new WebConfiguration.MeController())
                .setControllerAdvice(new ApiErrors()).addMappedInterceptors(new String[]{"/api/me"}, new DemoIdentity(mapper)).build();
    }
    @Test void filtersAndReturnsRules() throws Exception {
        when(mapper.templates("生活记录")).thenReturn(List.of(new CatalogMapper.TemplateRow("one", "日记", "生活记录", "描述", "/covers/journal.svg", 1, "image/jpeg,image/png", 5242880)));
        mvc.perform(get("/api/templates").param("category", "生活记录")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("one")).andExpect(jsonPath("$[0].acceptedMimeTypes[1]").value("image/png"));
        verify(mapper).templates("生活记录");
    }
    @Test void returns404ForMissingTemplate() throws Exception {
        mvc.perform(get("/api/templates/missing")).andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }
    @Test void returnsExistingTemplateDetails() throws Exception {
        when(mapper.template("one")).thenReturn(new CatalogMapper.TemplateRow("one", "日记", "生活记录", "描述", "/covers/journal.svg", 1, "image/jpeg,image/png", 5242880));
        mvc.perform(get("/api/templates/one")).andExpect(status().isOk()).andExpect(jsonPath("$.coverUrl").value("/covers/journal.svg"));
    }
    @Test void identityRejectsInvalidAndAcceptsKnownUser() throws Exception {
        when(mapper.user("demo-a")).thenReturn(new CatalogMapper.DemoUser("demo-a", "演示用户 A"));
        mvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("X-Demo-User", "unknown")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("X-Demo-User", "demo-a")).andExpect(status().isOk()).andExpect(jsonPath("$.id").value("demo-a"));
    }
}
