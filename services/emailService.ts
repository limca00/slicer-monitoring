
import { InspectionRecord } from '../types';

/**
 * Simulates sending an email alert to the supervisor.
 * In a production environment, this would call a backend API.
 */
export async function sendAlertEmail(record: InspectionRecord) {
  const recipient = "lvoza2003@gmail.com";
  const subject = `Slice Thickness Alert – ${record.slicerId}`;
  const body = `
    ATTENTION: Thickness out of specification.
    
    Slicer: ${record.slicerId}
    Variant: ${record.variant} (${record.solidRange}%)
    Measured X-bar: ${record.measuredXBar?.toFixed(3)} mm
    Specification: ${record.ll.toFixed(3)} – ${record.ul.toFixed(3)} mm
    Status: ${record.status}
    Report Timestamp: ${record.extractedDate} ${record.extractedTime}
  `.trim();

  // Logging the action as it would happen on a server
  console.log(`[Email Service] Sending alert to ${recipient}...`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);

  // We simulate a network delay
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`[Email Service] Email sent successfully to ${recipient}`);
      resolve(true);
    }, 1200);
  });
}
