package com.greaterchangehrms

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Downloads an authenticated payslip to the public Downloads collection.
 * DownloadManager owns the transfer, surfaces progress in Android, and works
 * without legacy external-storage permissions on modern Android releases.
 */
class PayslipDownloadModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "PayslipDownload"

  @ReactMethod
  fun download(url: String, fileName: String, authorization: String?, companyId: String?, promise: Promise) {
    try {
      val request = DownloadManager.Request(Uri.parse(url))
        .setTitle("Payslip")
        .setDescription("Downloading $fileName")
        .setMimeType("application/pdf")
        .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
        .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
        .setAllowedOverMetered(true)
        .setAllowedOverRoaming(true)

      if (!authorization.isNullOrBlank()) request.addRequestHeader("Authorization", authorization)
      if (!companyId.isNullOrBlank()) request.addRequestHeader("X-Company-Id", companyId)

      val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
      manager.enqueue(request)
      promise.resolve("Download started. You can open the PDF from the notification or Downloads folder.")
    } catch (error: Exception) {
      promise.reject("PAYSLIP_DOWNLOAD_FAILED", "Could not download the payslip PDF.", error)
    }
  }
}
