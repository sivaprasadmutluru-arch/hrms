package com.example.demo.billing;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class PublicPricingControllerTest {
    @Test void publishesOnlyThePublicCatalogWithoutBillingDetails() throws Exception {
        MockMvcBuilders.standaloneSetup(new PublicPricingController()).build()
            .perform(get("/api/public/pricing"))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.currency").value("INR"))
            .andExpect(jsonPath("$.plans.length()").value(4))
            .andExpect(jsonPath("$.plans[0].id").value("FREE"))
            .andExpect(jsonPath("$.plans[0].maxEmployees").value(20))
            .andExpect(jsonPath("$.organizationId").doesNotExist())
            .andExpect(jsonPath("$.checkoutAvailable").doesNotExist())
            .andExpect(jsonPath("$.manualAvailable").doesNotExist())
            .andExpect(jsonPath("$.history").doesNotExist());
    }
}
