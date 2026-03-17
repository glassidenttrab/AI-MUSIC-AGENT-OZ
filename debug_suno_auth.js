const axios = require('axios');
require('dotenv').config();

async function debugSunoAuth() {
    const cookie = process.env.SUNO_COOKIE;
    console.log("Full Cookie Length:", cookie.length);

    try {
        const response = await axios.get("https://clerk.suno.ai/v1/client", {
            params: { _clerk_js_version: "4.70.5" },
            headers: { 
                'Cookie': cookie,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://suno.com/',
                'Origin': 'https://suno.com'
            }
        });

        console.log("Status:", response.status);
        console.log("Response Data:", JSON.stringify(response.data, null, 2));

        if (response.data.response && response.data.response.last_active_session_id) {
            console.log("✅ Success! Found Session ID:", response.data.response.last_active_session_id);
        } else {
            console.log("❌ Failed to find session ID in response.");
        }
    } catch (error) {
        console.error("❌ Error during request:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

debugSunoAuth();
