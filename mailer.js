const nodemailer = require('nodemailer');
const dns = require('dns');

// Force IPv4 resolution to prevent ENETUNREACH errors on IPv6 networks
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

require('dotenv').config();

// Create transporter config
const transporterConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  family: 4, // Force IPv4 to fix ENETUNREACH on IPv6
  tls: {
    rejectUnauthorized: false
  },
  logger: true, // Log information to console
  debug: true   // Include SMTP traffic in the logs
};

// Add authentication only if credentials are provided
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporterConfig.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  };
}

const transporter = nodemailer.createTransport(transporterConfig);

/**
 * Sends an approval email to the borrower and CCs the IT department.
 * @param {Object} requestData - The borrow request record
 * @param {Object} assetData - The asset record
 * @param {string} toEmail - Borrower's email
 */
async function sendApprovalEmail(requestData, assetData, toEmail) {
  console.log(`[Email System] Initiating approval email process for asset: ${assetData.model_name}`);

  if (!process.env.SMTP_HOST) {
    console.warn('SMTP_HOST not configured in .env. Skipping email notification.');
    return;
  }

  const ccEmail = process.env.IT_DEPT_EMAIL || 'itsupport@aapico.com';
  const recipient = toEmail || ccEmail;
  const ccRecipient = toEmail ? ccEmail : undefined;
  const fromEmail = process.env.SMTP_USER || process.env.IT_DEPT_EMAIL || 'no-reply@aapico.com';

  console.log(`[Email System] Preparing to send to: ${recipient}${ccRecipient ? ', cc: ' + ccRecipient : ''}, from: ${fromEmail}`);

  const mailOptions = {
    from: `"IT Asset Hub" <${fromEmail}>`,
    to: recipient,
    //cc: ccRecipient,
    subject: `[IT Asset Hub] อนุมัติการยืมอุปกรณ์: ${assetData.model_name}`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>การอนุมัติยืมอุปกรณ์</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 30px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0c3365; padding: 30px; text-align: center; border-bottom: 4px solid #e21b22;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">AAPICO IT ASSET HUB</h1><br>
              <h3 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">Notification : IT Equipment Borrowing Request</h3>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #0c3365; margin-top: 0; font-size: 22px;">การอนุมัติยืมอุปกรณ์สำเร็จแล้ว 🎉</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555555;">เรียน คุณ <strong>${requestData.full_name}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #555555;">คำร้องขอยืมอุปกรณ์ของท่านได้รับการอนุมัติเรียบร้อยแล้ว โดยมีรายละเอียดดังต่อไปนี้:</p>
              
              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="margin-top: 25px; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
                <tr>
                  <td width="35%" style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #0c3365; background-color: #f8fafc;">รหัสพนักงาน</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;">${requestData.employee_id}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #0c3365; background-color: #f8fafc;">แผนก</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;">${requestData.department}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #0c3365; background-color: #f8fafc;">อุปกรณ์ที่ยืม</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;"><strong>${assetData.asset_tag}</strong> <br><span style="font-size: 13px; color: #888888;">(รุ่น : ${assetData.model_name})</span></td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #0c3365; background-color: #f8fafc;">ประเภทอุปกรณ์</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;">${assetData.category || assetData.computertype || 'ไม่ระบุ'}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #0c3365; background-color: #f8fafc;">วันที่เริ่มยืม</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;">${new Date(requestData.borrow_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #0c3365; background-color: #f8fafc;">กำหนดคืน</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;"><span style="color: #e21b22; font-weight: bold;">${new Date(requestData.expected_return_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span></td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #0c3365; background-color: #f8fafc;">วัตถุประสงค์</td>
                  <td style="color: #444444;">${requestData.borrow_purpose}</td>
                </tr>
              </table>

              <div style="margin-top: 35px; padding: 20px; background-color: #fef5f5; border-left: 4px solid #e21b22; border-radius: 4px;">
                <p style="margin: 0; font-size: 15px; color: #d32f2f;"><strong>📌 ข้อควรปฏิบัติ:</strong> กรุณาติดต่อแผนก IT เพื่อรับอุปกรณ์ตามวันและเวลาที่กำหนด</p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f7f6; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #888888;">นี่คืออีเมลอัตโนมัติจากระบบ IT Asset Hub กรุณาอย่าตอบกลับ</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #888888;">&copy; ${new Date().getFullYear()} AAPICO Hitech Public Company Limited. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
  };

  console.log(`[Email System] Sending mail via SMTP...`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email System] Approval email sent successfully! Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('[Email System] Critical Error sending approval email:', error);
  }
}

/**
 * Sends a rejection email to the borrower and CCs the IT department.
 * @param {Object} requestData - The borrow request record
 * @param {Object} assetData - The asset record
 * @param {string} toEmail - Borrower's email
 */
async function sendRejectionEmail(requestData, assetData, toEmail) {
  console.log(`[Email System] Initiating rejection email process for asset: ${assetData ? assetData.model_name : 'Unknown'}`);

  if (!process.env.SMTP_HOST) {
    console.warn('SMTP_HOST not configured in .env. Skipping email notification.');
    return;
  }

  const ccEmail = process.env.IT_DEPT_EMAIL || 'itsupport@aapico.com';
  const recipient = toEmail || ccEmail;
  const ccRecipient = toEmail ? ccEmail : undefined;
  const fromEmail = process.env.SMTP_USER || process.env.IT_DEPT_EMAIL || 'no-reply@aapico.com';

  console.log(`[Email System] Preparing to send rejection to: ${recipient}${ccRecipient ? ', cc: ' + ccRecipient : ''}, from: ${fromEmail}`);

  const mailOptions = {
    from: `"IT Asset Hub" <${fromEmail}>`,
    to: recipient,
    //cc: ccRecipient,
    subject: `[IT Asset Hub] แจ้งผลคำขอยืมอุปกรณ์: ไม่อนุมัติ (${assetData ? assetData.model_name : 'Unknown'})`,
    html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>ผลการอนุมัติยืมอุปกรณ์: ไม่อนุมัติ</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; color: #333333;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6; padding: 30px 0;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #e21b22; padding: 30px; text-align: center; border-bottom: 4px solid #b71c1c;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">AAPICO IT ASSET HUB</h1><br>
              <h3 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 1px;">Notification : IT Equipment Borrowing Request</h3>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #d32f2f; margin-top: 0; font-size: 22px;">ไม่อนุมัติคำขอยืมอุปกรณ์ ❌</h2>
              <p style="font-size: 16px; line-height: 1.6; color: #555555;">เรียน คุณ <strong>${requestData.full_name}</strong>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #555555;">คำร้องขอยืมอุปกรณ์ของท่าน <strong>ไม่ได้รับการอนุมัติ</strong> โดยมีรายละเอียดดังต่อไปนี้:</p>
              
              <div style="margin-top: 25px; padding: 20px; background-color: #fef5f5; border-left: 4px solid #e21b22; border-radius: 4px;">
                <h4 style="margin: 0 0 10px 0; color: #d32f2f;">เหตุผลที่ไม่อนุมัติ:</h4>
                <p style="margin: 0; font-size: 16px; color: #333;">${requestData.reject_reason || 'ไม่ระบุเหตุผล'}</p>
              </div>

              <table width="100%" border="0" cellspacing="0" cellpadding="14" style="margin-top: 25px; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
                <tr>
                  <td width="35%" style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #e21b22; background-color: #f8fafc;">อุปกรณ์ที่ขอยืม</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;"><strong>${assetData ? assetData.asset_tag : '-'}</strong> <br><span style="font-size: 13px; color: #888888;">(รุ่น : ${assetData ? assetData.model_name : '-'})</span></td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #e21b22; background-color: #f8fafc;">วันที่เริ่มยืม</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;">${new Date(requestData.borrow_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="border-bottom: 1px solid #e0e0e0; font-weight: 600; color: #e21b22; background-color: #f8fafc;">กำหนดคืน</td>
                  <td style="border-bottom: 1px solid #e0e0e0; color: #444444;">${new Date(requestData.expected_return_date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; color: #e21b22; background-color: #f8fafc;">วัตถุประสงค์</td>
                  <td style="color: #444444;">${requestData.borrow_purpose}</td>
                </tr>
              </table>

            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f4f7f6; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="margin: 0; font-size: 12px; color: #888888;">นี่คืออีเมลอัตโนมัติจากระบบ IT Asset Hub กรุณาอย่าตอบกลับ</p>
              <p style="margin: 5px 0 0 0; font-size: 12px; color: #888888;">&copy; ${new Date().getFullYear()} AAPICO Hitech Public Company Limited. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
  };

  console.log(`[Email System] Sending rejection mail via SMTP...`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email System] Rejection email sent successfully! Message ID: ${info.messageId}`);
  } catch (error) {
    console.error('[Email System] Critical Error sending rejection email:', error);
  }
}

module.exports = {
  sendApprovalEmail,
  sendRejectionEmail
};
