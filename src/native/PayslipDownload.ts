import {NativeModules, Platform} from 'react-native';

type PayslipDownloadModule = {
  download(url: string, fileName: string, authorization?: string, companyId?: string): Promise<string>;
};

const nativeModule = NativeModules.PayslipDownload as PayslipDownloadModule | undefined;

/** Saves a protected payslip PDF to the device Downloads folder. */
export async function downloadPayslipPdf(
  url: string,
  fileName: string,
  headers: Record<string, string>,
): Promise<string> {
  if (Platform.OS !== 'android' || !nativeModule) {
    throw new Error('PDF downloads are currently available on Android devices.');
  }

  return nativeModule.download(url, fileName, headers.Authorization, headers['X-Company-Id']);
}
