package com.example.demo.base.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class BrandedEmailRendererTest {
    @Test void wrapsNotificationWithAccrueBrand() {
        String html = BrandedEmailRenderer.render("Your leave is approved", "<p>Hello Alex</p>");
        assertThat(html).contains("Accrue<span", "Your leave is approved", "<p>Hello Alex</p>", "#173858", "#d7ae45");
    }

    @Test void escapesSubjectAndPlainTextBody() {
        String html = BrandedEmailRenderer.render("<script>alert(1)</script>", "Hello <Alex>\nSee you");
        assertThat(html).contains("&lt;script&gt;", "Hello &lt;Alex&gt;<br>See you")
                .doesNotContain("<script>");
    }

    @Test void leavesCompleteCustomHtmlEmailUntouched() {
        String original = "<!doctype html><html><body>Custom</body></html>";
        assertThat(BrandedEmailRenderer.render("Custom", original)).isEqualTo(original);
    }

    @Test void existingMessageHeadingDoesNotGetDuplicated() {
        String html = BrandedEmailRenderer.render("Subscription reminder", "<h2>Billing update</h2><p>Review your plan.</p>");
        assertThat(html).contains("<h2>Billing update</h2>").doesNotContain("<h1 style=");
    }

    @Test void organizationBrandReplacesPlatformIdentityAndEscapesName() {
        String html = BrandedEmailRenderer.render("Welcome", "<p>Hello</p>", "Acme & Co", "#A12B3C");
        assertThat(html).contains("Acme &amp; Co", "background:#A12B3C", "sent by Acme &amp; Co")
                .doesNotContain("AccrueHR");
    }

    @Test void invalidColorFallsBackToSafeDefault() {
        String html = BrandedEmailRenderer.render("Welcome", "Hello", "Acme", "red;position:absolute");
        assertThat(html).contains("background:#2F73B7").doesNotContain("position:absolute");
    }

    @Test void lightBrandColorUsesDarkHeaderText() {
        assertThat(BrandedEmailRenderer.render("Welcome", "Hello", "Acme", "#FFE59A"))
                .contains("color:#173858;\">Acme</span>");
        assertThat(BrandedEmailRenderer.textColorFor("#FFE59A")).isEqualTo("#173858");
    }
}
