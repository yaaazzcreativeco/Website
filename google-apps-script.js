/**
 * ============================================================
 * YAAAZZ CREATIVE CO. — Google Apps Script (Merged & Fixed)
 * ============================================================
 * MAIN TRIGGER: Set a time-driven trigger on scanAllInboxes()
 * Recommended: Every 1 to 5 minutes.
 * ============================================================
 * NOTE: Ensure "Gmail API" is enabled in your project Services.
 * ============================================================
 */

function scanAllInboxes() {
  scanPrayerInbox();
  scanWebsiteBuilderInbox();
  scanYaaazzOrders(); // New Order Scanner
}

/**
 * SCANNER: YAAAZZ SHOP ORDERS
 */
function scanYaaazzOrders() {
  Logger.log("--- Starting Yaaazz Order Scan ---");

  var searchQuery = '(from:submissions@formsubmit.co OR from:notify@web3forms.com) subject:"Yaaazz Order" is:unread -label:AUTO-REPLIED';
  var threads = GmailApp.search(searchQuery);

  if (threads.length === 0) {
    Logger.log("No new Yaaazz orders found.");
    return;
  }

  var processedLabel = GmailApp.getUserLabelByName("AUTO-REPLIED") || GmailApp.createLabel("AUTO-REPLIED");
  var orderLabel     = GmailApp.getUserLabelByName("1. YaaazZ Orders") || GmailApp.createLabel("1. YaaazZ Orders");

  for (var i = 0; i < threads.length; i++) {
    var messages    = threads[i].getMessages();
    var lastMessage = messages[messages.length - 1];

    var replyEmail = lastMessage.getReplyTo() || lastMessage.getFrom();
    var body       = lastMessage.getPlainBody();
    var subject    = lastMessage.getSubject();

    // Extract customer first name from subject: "Yaaazz Order - [Name] [...]"
    var firstName = "Friend";
    var nameMatch = subject.match(/Yaaazz Order\s*-\s*([^\[]+)/i);
    if (nameMatch && nameMatch[1]) {
      firstName = nameMatch[1].trim().split(/\s+/)[0];
    }
    if (!firstName || /^(forward|reply|fwd)$/i.test(firstName)) firstName = "Friend";

    // Clean up email address
    var emailMatch = replyEmail.match(/[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/);
    var cleanEmail = emailMatch ? emailMatch[0] : null;

    if (cleanEmail) {
      sendYaaazzOrderAutoReply(firstName, cleanEmail, body);

      threads[i].addLabel(processedLabel);
      threads[i].addLabel(orderLabel);
      threads[i].markUnread(); // Keep it unread so you see the notification
      Logger.log("SUCCESS: Order auto-reply sent to " + firstName + " <" + cleanEmail + ">");
    } else {
      Logger.log("SKIP: No valid reply-to email found for thread " + i + " (subject: " + subject + ")");
    }
  }
}

/**
 * CORE LOGIC: Sends the branded HTML Email for YAAAZZ ORDERS (With Emoji Fix)
 */
function sendYaaazzOrderAutoReply(name, email, rawBody) {
  var subject = "Your Yaaazz Order Has Been Received! 🎀";

  // Extract the order_summary field from the FormSubmit email body
  var orderBlock = extractOrderSummary(rawBody);

  var htmlBody =
    "<div style='font-family: Arial, sans-serif; line-height: 1.7; color: #312f23; max-width: 600px; margin: 0 auto;'>" +

    // Header
    "<div style='background: linear-gradient(135deg, #b35c7a, #7d4d5f); padding: 32px 28px; border-radius: 16px 16px 0 0; text-align: center;'>" +
      "<p style='margin:0; font-size:32px;'>🎀</p>" +
      "<h1 style='margin: 8px 0 4px; color: #fff; font-size: 22px; font-weight: 900;'>Order Received!</h1>" +
      "<p style='margin:0; color: rgba(255,255,255,0.85); font-size: 14px;'>Thank you for shopping with Yaaazz Creative Co. ✨</p>" +
    "</div>" +

    // Body
    "<div style='background: #fdf8f0; padding: 28px; border: 1px solid #e8e0d0; border-top: none;'>" +
      "<p style='margin: 0 0 16px;'>Hi <strong>" + name + "</strong>! 👋</p>" +
      "<p style='margin: 0 0 20px;'>We've received your order and we're so excited to prepare it for you! 🌸</p>" +

      // Order summary box
      "<div style='background: #fff; border: 1.5px solid #e0d4c0; border-radius: 12px; padding: 20px; margin-bottom: 24px;'>" +
        "<h2 style='margin: 0 0 12px; font-size: 14px; color: #7d4d5f; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;'>📋 Your Order Summary</h2>" +
        "<pre style='margin:0; font-family: monospace; font-size: 13px; color: #444; white-space: pre-wrap; word-break: break-word; line-height: 1.6;'>" + escapeHtml(orderBlock) + "</pre>" +
      "</div>" +

      // Delivery info box
      "<div style='background: #fff8e1; border: 1.5px solid #f0c040; border-radius: 12px; padding: 20px; margin-bottom: 24px;'>" +
        "<h2 style='margin: 0 0 8px; font-size: 14px; color: #7a5c00; font-weight: 800;'>📦 About Your Delivery</h2>" +
        "<p style='margin: 0 0 10px; font-size: 13px; color: #7a5c00; line-height: 1.6;'>" +
          "Your shipping fee will be based on the <strong>prevailing SPX Express rates</strong> and your delivery location." +
        "</p>" +
        "<p style='margin: 0; font-size: 13px; color: #7a5c00; line-height: 1.6;'>" +
          "Our customer representative will reach out to you via <strong>call or email</strong> with:" +
        "</p>" +
        "<ul style='margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #7a5c00;'>" +
          "<li>Exact delivery fee</li>" +
          "<li>Payment details &amp; accepted methods</li>" +
        "</ul>" +
      "</div>" +

      // Timeline note
      "<div style='background: #eaf4ea; border: 1.5px solid #a8d5a2; border-radius: 12px; padding: 16px; margin-bottom: 24px;'>" +
        "<p style='margin:0; font-size: 13px; color: #2d6a2d; line-height: 1.6;'>" +
          "⏰ Please expect to hear from us <strong>shortly</strong>. " +
          "Our team will reach out to you as soon as we can! " +
          "If you have questions in the meantime, feel free to reply to this email or chat with us on our website. 💛" +
        "</p>" +
      "</div>" +
    "</div>" +

    // Footer
    "<div style='background: #f0e8da; padding: 20px 28px; border-radius: 0 0 16px 16px; border: 1px solid #e8e0d0; border-top: none; text-align: center;'>" +
      "<p style='margin: 0; font-size: 13px; color: #999;'>With love,<br>" +
      "<strong style='color: #7d4d5f; font-size: 15px;'>Yaaazz Creative Co. 🎀</strong></p>" +
    "</div>" +

    "</div>";

  var encodedSubject = encodeSubject(subject);
  
  var rawMessage = [
    'From: Yaaazz Creative Co. <yaaazz.creativeco@gmail.com>',
    'To: ' + email,
    'Subject: ' + encodedSubject,
    'Content-Type: text/html; charset=UTF-8', 
    'Content-Transfer-Encoding: base64',
    '',
    Utilities.base64Encode(htmlBody, Utilities.Charset.UTF_8)
  ].join('\r\n');
  
  var encodedRaw = Utilities.base64EncodeWebSafe(rawMessage, Utilities.Charset.UTF_8);
  
  try {
    Gmail.Users.Messages.send({ raw: encodedRaw }, 'me');
  } catch (e) {
    Logger.log("Error: " + e.message);
  }
}

/**
 * SCANNER FUNCTION FOR PRAYER COMMUNITY
 */
function scanPrayerInbox() {
  Logger.log("Starting Prayer Scan...");
  
  var searchQuery = '(from:submissions@formsubmit.co OR from:notify@web3forms.com) "Prayer Community" is:unread -label:AUTO-REPLIED';
  var threads = GmailApp.search(searchQuery);
  
  if (threads.length === 0) return;

  var processedLabel = GmailApp.getUserLabelByName("AUTO-REPLIED") || GmailApp.createLabel("AUTO-REPLIED");

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    var lastMessage = messages[messages.length - 1];
    
    var email = lastMessage.getReplyTo(); 
    var body = lastMessage.getPlainBody();
    var subject = lastMessage.getSubject();
    
    var firstName = "Soul"; 

    var subjectMatch = subject.match(/Prayer Community\s*-\s*([^\[]+)/i);
    if (subjectMatch && subjectMatch[1]) {
      firstName = subjectMatch[1].trim().split(' ')[0];
    } else {
      var bodyMatch = body.match(/name\s*[\r\n]+([A-Za-z]+)/i);
      if (bodyMatch && bodyMatch[1]) {
        firstName = bodyMatch[1].trim();
      }
    }

    if (firstName.toLowerCase() === "forward" || firstName.toLowerCase() === "reply") {
      firstName = "Soul";
    }

    if (email && email.includes("@")) {
      sendPrayerAutoReply(firstName, email);
      
      threads[i].addLabel(processedLabel);
      threads[i].markRead(); 
      Logger.log("SUCCESS: Sent to " + firstName);
    }
  }
}

/**
 * SCANNER FUNCTION FOR WEBSITE BUILDER INQUIRY
 */
function scanWebsiteBuilderInbox() {
  Logger.log("Starting Website Builder Scan...");
  
  var searchQuery = '(from:submissions@formsubmit.co OR from:notify@web3forms.com) "Website Builder Inquiry" is:unread -label:AUTO-REPLIED';
  var threads = GmailApp.search(searchQuery);
  
  if (threads.length === 0) return;

  var processedLabel = GmailApp.getUserLabelByName("AUTO-REPLIED") || GmailApp.createLabel("AUTO-REPLIED");

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    var lastMessage = messages[messages.length - 1];
    
    var email = lastMessage.getReplyTo(); 
    var body = lastMessage.getPlainBody();
    var subject = lastMessage.getSubject();
    
    var firstName = "Friend"; 

    var subjectMatch = subject.match(/Website Builder Inquiry\s*-\s*([^\[]+)/i);
    if (subjectMatch && subjectMatch[1]) {
      firstName = subjectMatch[1].trim().split(' ')[0];
    } else {
      var bodyMatch = body.match(/name\s*[\r\n]+([A-Za-z]+)/i);
      if (bodyMatch && bodyMatch[1]) {
        firstName = bodyMatch[1].trim();
      }
    }

    if (firstName.toLowerCase() === "forward" || firstName.toLowerCase() === "reply") {
      firstName = "Friend";
    }

    if (email && email.includes("@")) {
      sendWebsiteBuilderAutoReply(firstName, email);
      
      threads[i].addLabel(processedLabel);
      threads[i].markRead(); 
      Logger.log("SUCCESS: Sent to (Website Builder) " + firstName);
    }
  }
}

/**
 * HELPER: Encodes the subject line for Emojis
 */
function encodeSubject(text) {
  var base64 = Utilities.base64Encode(text, Utilities.Charset.UTF_8);
  return '=?UTF-8?B?' + base64 + '?=';
}

/**
 * CORE LOGIC: Sends the HTML Email for PRAYER COMMUNITY
 */
function sendPrayerAutoReply(name, email) {
  var subject = "We're Here to Pray With You 🙏 ✨";
  
  var htmlBody = 
    "<div style='font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;'>" +
      "<p>Hello Beautiful Soul <b>" + name + "</b>, ✨</p>" +
      
      "<p>Thank you so much for reaching out to us. We want you to know that your message has been received with love.</p>" +
      
      "<blockquote style='border-left: 4px solid #ffd700; padding-left: 15px; margin: 20px 0; color: #555;'>" +
        "<i>\"Cast all your anxiety on Him because He cares for you.\"</i> — <b>1 Peter 5:7</b> ❤️" +
      "</blockquote>" +
      
      "<p>If you have a <b>specific prayer request</b>, we would be honored to stand with you in faith. " +
      "Simply <b>reply to this email</b> and share what is on your heart. Our team will pray for you with care, faith, and compassion. 🙏</p>" +
      
      "<p>You don't have to carry your burdens alone. We're here for you. 💛</p>" +
      
      "<hr style='border: 0; border-top: 1px solid #eee; margin: 30px 0;'>" +
      
      "<p style='color: #888;'>In His love,<br>" +
      "<strong style='color: #333;'>YCC Prayer Community</strong></p>" +
    "</div>";

  var encodedSubject = encodeSubject(subject);
  
  var rawMessage = [
    'From: YCC Prayer Community <yaaazz.creativeco@gmail.com>',
    'To: ' + email,
    'Subject: ' + encodedSubject,
    'Content-Type: text/html; charset=UTF-8', 
    'Content-Transfer-Encoding: base64',
    '',
    Utilities.base64Encode(htmlBody, Utilities.Charset.UTF_8)
  ].join('\r\n');
  
  var encodedRaw = Utilities.base64EncodeWebSafe(rawMessage, Utilities.Charset.UTF_8);
  
  try {
    Gmail.Users.Messages.send({ raw: encodedRaw }, 'me');
  } catch (e) {
    Logger.log("Error: " + e.message);
  }
}

/**
 * CORE LOGIC: Sends the HTML Email for WEBSITE BUILDER INQUIRY
 */
function sendWebsiteBuilderAutoReply(name, email) {
  var subject = "Website Builder Inquiry Received ✨";
  
  var htmlBody = 
    "<div style='font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px;'>" +
      "<p>Hello <b>" + name + "</b>,</p>" +
      
      "<p>Thanks so much for reaching out! 👋 Since you took the time to explore the site and found your way to my inquiry form, I'm guessing you liked the creative look and feel of my work—thank you! That really means a lot. ✨</p>" +
      
      "<p>I would love to help bring your own digital vision to life. 💻 Creating a beautiful, high-performing website shouldn't have to break the bank. Based on current industry rates in the Philippines, I am proud to offer one of the most competitive and high-value packages available! 🇵🇭</p>" +
      
      "<blockquote style='border-left: 4px solid #ffd700; padding-left: 15px; margin: 25px 0; color: #555;'>" +
        "<strong style='color: #333; font-size: 1.1em;'>💎 The Semi-Custom Package</strong><br>" +
        "<i>A stunning 3-5 page semi-custom website for only <b>₱30,000 PHP</b>.</i><br>" +
        "<span style='font-size: 0.9em; color: #777;'>Perfect for establishing a premium online presence without the premium price tag.</span>" +
      "</blockquote>" +

      "<p><b>🛠️ Worried about tech headaches after launch?</b> Don't be!<br>" +
      "As an exclusive perk for websites built by YCC, I offer an affordable <b>Monthly Maintenance & Retainer plan</b>. This means I stay on-call to handle your updates, tweaks, and website health so you can focus 100% on running your business. 📈</p>" +
      
      "<p><b>Simply reply to this email</b> with a brief overview of your dream project, or let me know if you'd prefer to hop on a quick, no-pressure discovery call. 🗓️</p>" +
      
      "<p>I can't wait to see what we can create together! 🚀</p>" +
      
      "<hr style='border: 0; border-top: 1px solid #eee; margin: 30px 0;'>" +
      
      "<p style='color: #888;'>Best regards,<br>" +
      "<strong style='color: #333;'>YCC Creative PH</strong></p>" +
    "</div>";

  var encodedSubject = encodeSubject(subject);
  
  var rawMessage = [
    'From: YCC Creative Co <yaaazz.creativeco@gmail.com>',
    'To: ' + email,
    'Subject: ' + encodedSubject,
    'Content-Type: text/html; charset=UTF-8', 
    'Content-Transfer-Encoding: base64',
    '',
    Utilities.base64Encode(htmlBody, Utilities.Charset.UTF_8)
  ].join('\r\n');
  
  var encodedRaw = Utilities.base64EncodeWebSafe(rawMessage, Utilities.Charset.UTF_8);
  
  try {
    Gmail.Users.Messages.send({ raw: encodedRaw }, 'me');
  } catch (e) {
    Logger.log("Error: " + e.message);
  }
}

/**
 * HELPER: Extracts the order_summary field value from the FormSubmit email body.
 */
function extractOrderSummary(body) {
  // 1. Try to find the order_summary field (handles *order_summary* with or without colons)
  var match = body.match(/\*?order[_\s]summary\*?\s*[:\|]?\s*([\s\S]+?)(?:\n\*?[A-Za-z_][A-Za-z0-9_\s]*\*?[:\|]|\nSubmitted at|\nSponsor|$)/i);
  if (match && match[1] && match[1].trim().length > 10) {
    return match[1].trim();
  }

  // 2. Fallback: Search for our explicit header block directly
  var startMarker = "=== YAAAZZ ORDER ===";
  var startIndex = body.indexOf(startMarker);
  if (startIndex !== -1) {
    // End before the footer or next fields start
    var endMarkers = ["Submitted at", "Sponsor <https://formsubmit.co", "Powered by Web3Forms", "Sent via Web3Forms", "Submit Time", "IP Address"];
    var endIndex = -1;
    for (var j = 0; j < endMarkers.length; j++) {
      var idx = body.indexOf(endMarkers[j], startIndex);
      if (idx !== -1 && (endIndex === -1 || idx < endIndex)) {
        endIndex = idx;
      }
    }
    if (endIndex !== -1) {
      return body.substring(startIndex, endIndex).trim();
    }
    return body.substring(startIndex, startIndex + 1200).trim();
  }

  return "Please check the original order email for details.";
}

/**
 * HELPER: Escapes HTML special characters for safe use in <pre> blocks.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
