// Test script to debug prayer time fetching
// Run this with: deno run --allow-net test-prayer-times.ts

const EXTERNAL_PRAYER_DB_URL = "https://twlkumpbwplusfqhgchw.supabase.co";
const EXTERNAL_PRAYER_DB_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bGt1bXBid3BsdXNmcWhnY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDk1NzMsImV4cCI6MjA2Nzg4NTU3M30.2iB_wRs8YoWYwqNHveW8wrpBzumOw8IbnIPtnC1WhMc";

async function testPrayerTimes() {
  const now = new Date();
  const ukDate = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  const day = ukDate.getDate();
  const month = ukDate.getMonth() + 1;

  console.log("Current UK date:", `${day}/${month}/${ukDate.getFullYear()}`);
  console.log("Current UK time:", ukDate.toLocaleTimeString("en-GB"));
  console.log();

  const dateFormats = [
    `${day}/${month}`,
    `${day}/${String(month).padStart(2, '0')}`,
    `${String(day).padStart(2, '0')}/${month}`,
    `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
  ];

  console.log("Trying date formats:", dateFormats.join(", "));
  console.log();

  for (const dateStr of dateFormats) {
    const url = `${EXTERNAL_PRAYER_DB_URL}/rest/v1/MasjidIrshadTimes?Date=eq.${dateStr}&select=*`;

    console.log(`Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        "apikey": EXTERNAL_PRAYER_DB_ANON_KEY,
        "Authorization": `Bearer ${EXTERNAL_PRAYER_DB_ANON_KEY}`,
      },
    });

    if (response.ok) {
      const data = await response.json();

      if (data && data.length > 0) {
        console.log(`✓ Found data for format: ${dateStr}`);
        console.log("Prayer times:", JSON.stringify(data[0], null, 2));
        return;
      } else {
        console.log(`✗ No data for format: ${dateStr}`);
      }
    } else {
      console.log(`✗ Error for format: ${dateStr} - Status: ${response.status}`);
    }
    console.log();
  }

  console.log("❌ No prayer times found for any date format");
}

testPrayerTimes();
