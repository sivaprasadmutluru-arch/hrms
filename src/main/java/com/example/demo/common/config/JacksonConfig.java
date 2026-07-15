package com.example.demo.common.config;

import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Registers Hibernate6Module so Jackson serializes uninitialized lazy proxies
 * as null instead of throwing ByteBuddyInterceptor / no-session errors.
 */
@Configuration
public class JacksonConfig {

    @Bean
    public Hibernate6Module hibernate6Module() {
        return new Hibernate6Module();
    }

    /**
     * A handful of self-referencing entities (e.g. Employee.reportingManager) get
     * serialized as raw entities by some endpoints. Real data can end up with a
     * literal self-reference (an employee's reportingManagerId pointing at their
     * own row) or a short mutual cycle — without this, Jackson hard-fails the
     * whole response with "Direct self-reference leading to cycle" instead of
     * just omitting the offending nested property.
     */
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer disableFailOnSelfReferences() {
        return builder -> builder.featuresToDisable(SerializationFeature.FAIL_ON_SELF_REFERENCES);
    }
}
