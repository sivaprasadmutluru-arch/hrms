package com.example.demo.base.service;

/** Shared, email-client-friendly AccrueHR frame for application messages. */
public final class BrandedEmailRenderer {
    private BrandedEmailRenderer() {}

    public static String render(String subject, String body) {
        return render(subject, body, "AccrueHRMS", "#173858");
    }

    public static String render(String subject, String body, String brandName, String brandColor) {
        String content = body == null ? "" : body.trim();
        // An explicitly authored full email document keeps its own layout.
        if (content.matches("(?is)^\\s*(?:<!doctype\\s+html[^>]*>\\s*)?<html(?:\\s|>).*")) return content;
        if (!content.matches("(?is).*<\\s*(?:p|div|h[1-6]|a|span|strong|b|br|table|ul|ol|li|blockquote|section|img)\\b[^>]*>.*")) {
            content = escape(content).replace("\n", "<br>");
        }
        String heading = escape(subject == null || subject.isBlank() ? "An update for you" : subject);
        String name = escape(brandName == null || brandName.isBlank() ? "AccrueHRMS" : brandName.trim());
        String color = brandColor != null && brandColor.matches("#[0-9a-fA-F]{6}") ? brandColor : "#2F73B7";
        boolean platform = "AccrueHRMS".equalsIgnoreCase(brandName) || "AccrueHR".equalsIgnoreCase(brandName);
        String headerColor = platform ? "#173858" : color;
        String accentColor = platform ? "#d7ae45" : color;
        String headerTextColor = textColorFor(headerColor);
        String brandMark = platform ? "Accrue<span style=\"color:#e4bb56;\">HRMS</span>" : name;
        String help = platform ? "This message was sent by AccrueHRMS. Need help? Reach us at support@accruetechnologies.com or contact your HR team."
                : "This message was sent by " + name + ". Contact your HR team if you need help.";
        String headingBlock = content.matches("(?is)^\\s*<h[12]\\b.*") ? ""
                : "<h1 style=\"margin:0 0 22px;color:#173858;font-size:24px;line-height:1.3;font-weight:700;\">" + heading + "</h1>";
        return "<!doctype html><html lang=\"en\"><head><meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">"
                + "<title>" + heading + "</title></head>"
                + "<body style=\"margin:0;padding:0;background:#edf4fb;font-family:Arial,Helvetica,sans-serif;color:#294762;\">"
                + "<div style=\"display:none;max-height:0;overflow:hidden;opacity:0;\">" + heading + "</div>"
                + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"100%\" style=\"background:#edf4fb;\"><tr><td align=\"center\" style=\"padding:32px 12px;\">"
                + "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" width=\"600\" style=\"width:100%;max-width:600px;background:#ffffff;border:1px solid #dce8f4;border-radius:16px;\">"
                + "<tr><td style=\"background:" + headerColor + ";padding:25px 34px;border-radius:16px 16px 0 0;\">"
                + "<span style=\"font-size:24px;font-weight:700;letter-spacing:-0.5px;color:" + headerTextColor + ";\">" + brandMark + "</span>"
                + "</td></tr><tr><td height=\"4\" style=\"background:" + accentColor + ";font-size:0;line-height:0;\">&nbsp;</td></tr>"
                + "<tr><td style=\"padding:34px 34px 30px;\">"
                + headingBlock
                + "<div style=\"color:#38536e;font-size:15px;line-height:1.7;\">" + content + "</div>"
                + "</td></tr><tr><td style=\"padding:22px 34px;background:#f5f9fd;border-top:1px solid #dce8f4;border-radius:0 0 16px 16px;\">"
                + "<p style=\"margin:0 0 7px;color:#173858;font-size:13px;font-weight:700;\">" + name + "</p>"
                + "<p style=\"margin:0;color:#6b8095;font-size:12px;line-height:1.6;\">" + help + "</p>"
                + "</td></tr></table></td></tr></table></body></html>";
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }

    public static String textColorFor(String color) {
        if (color == null || !color.matches("#[0-9a-fA-F]{6}")) return "#ffffff";
        int brightness = (Integer.parseInt(color.substring(1, 3), 16) * 299
                + Integer.parseInt(color.substring(3, 5), 16) * 587
                + Integer.parseInt(color.substring(5, 7), 16) * 114) / 1000;
        return brightness > 175 ? "#173858" : "#ffffff";
    }
}
