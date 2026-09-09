package com.example.demo.leave.controller;

import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.CALLS_REAL_METHODS;
import static org.mockito.Mockito.mock;

class LeaveControllerHistoricalImportTest {

    private final LeaveController controller = mock(LeaveController.class, CALLS_REAL_METHODS);

    @Test
    void generatedTemplateUsesTheSameColumnsAcceptedByTheImporter() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            CellStyle headerStyle = workbook.createCellStyle();
            ReflectionTestUtils.invokeMethod(controller, "createHistoricalTemplateSheet",
                    workbook, "Annual Leave", headerStyle);

            Sheet sheet = workbook.getSheet("Annual Leave");
            assertThat(sheet).isNotNull();
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Emp ID");
            assertThat(sheet.getRow(0).getCell(1).getStringCellValue()).isEqualTo("Request From");
            assertThat(sheet.getRow(0).getCell(2).getStringCellValue()).isEqualTo("Request To");
            assertThat(sheet.getRow(0).getCell(3).getStringCellValue()).isEqualTo("Duration");
            assertThat(sheet.getLastRowNum()).isZero();
        }
    }

    @Test
    void parsesDateRangesAndHalfDayDurations() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Row row = workbook.createSheet().createRow(0);
            row.createCell(0).setCellValue("11-Feb-2026\u00A0- 12-Feb-2026");

            LocalDate[] dates = ReflectionTestUtils.invokeMethod(
                    controller, "parseHistoricalDateRange", row.getCell(0), null);
            double duration = ReflectionTestUtils.invokeMethod(
                    controller, "parseHistoricalDuration", "0.5 Days");

            assertThat(dates).containsExactly(LocalDate.of(2026, 2, 11), LocalDate.of(2026, 2, 12));
            assertThat(duration).isEqualTo(0.5);
        }
    }

    @Test
    void preservesLeadingZeroEmployeeBadgeFromExcelDisplayFormat() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Row row = workbook.createSheet().createRow(0);
            row.createCell(0).setCellValue(32);
            CellStyle style = workbook.createCellStyle();
            DataFormat format = workbook.createDataFormat();
            style.setDataFormat(format.getFormat("000"));
            row.getCell(0).setCellStyle(style);

            String badge = ReflectionTestUtils.invokeMethod(
                    controller, "historicalString", row, Map.of("emp id", 0), "emp id");

            assertThat(badge).isEqualTo("032");
        }
    }

    @Test
    void parsesTextAndExcelSerialDates() throws Exception {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Row row = workbook.createSheet().createRow(0);
            row.createCell(0).setCellValue("18 May 2026");
            row.createCell(1).setCellValue(46106);

            LocalDate textDate = ReflectionTestUtils.invokeMethod(
                    controller, "parseHistoricalDateCell", row.getCell(0));
            LocalDate serialDate = ReflectionTestUtils.invokeMethod(
                    controller, "parseHistoricalDateCell", row.getCell(1));

            assertThat(textDate).isEqualTo(LocalDate.of(2026, 5, 18));
            assertThat(serialDate).isEqualTo(LocalDate.of(2026, 3, 25));
        }
    }
}
