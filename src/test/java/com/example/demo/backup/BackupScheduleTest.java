package com.example.demo.backup;
import com.example.demo.backup.engine.BackupManager;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import static org.assertj.core.api.Assertions.*;
class BackupScheduleTest {
 BackupManager.Settings settings(String frequency,String zone,int hour){return new BackupManager.Settings(true,true,false,true,frequency,hour,0,zone);}
 @Test void dailyUsesConfiguredTimeZone(){assertThat(BackupManager.nextRun(settings("DAILY","Asia/Kolkata",2),Instant.parse("2026-11-03T12:00:00Z"))).isEqualTo(Instant.parse("2026-11-03T20:30:00Z"));}
 @Test void sameMinuteMovesToNextDay(){assertThat(BackupManager.nextRun(settings("DAILY","UTC",2),Instant.parse("2026-11-03T02:00:00Z"))).isEqualTo(Instant.parse("2026-11-04T02:00:00Z"));}
 @Test void weeklyUsesMonday(){assertThat(BackupManager.nextRun(settings("WEEKLY","UTC",2),Instant.parse("2026-11-03T12:00:00Z"))).isEqualTo(Instant.parse("2026-11-09T02:00:00Z"));}
 @Test void monthlyCrossesYear(){assertThat(BackupManager.nextRun(settings("MONTHLY","UTC",2),Instant.parse("2026-12-31T12:00:00Z"))).isEqualTo(Instant.parse("2027-01-01T02:00:00Z"));}
 @Test void springClockChangeStaysInLocalTime(){assertThat(BackupManager.nextRun(settings("DAILY","Europe/London",2),Instant.parse("2027-03-27T12:00:00Z"))).isEqualTo(Instant.parse("2027-03-28T01:00:00Z"));}
 @Test void unknownFrequencyIsRejected(){assertThatThrownBy(()->BackupManager.nextRun(settings("INVALID","UTC",2),Instant.now())).isInstanceOf(IllegalArgumentException.class);}
}
