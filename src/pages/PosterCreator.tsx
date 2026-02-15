import { useState, useCallback, useRef } from "react";

// ─── CONSTANTS ──────────────────────────────────────────────
const MASJID_DEFAULTS = {
  name: "Masjid Irshad",
  address: "400B Dallow Road",
  city: "Luton",
  postcode: "LU1 1UR",
  website: "masjidirshad.co.uk",
  phone: "",
  email: "",
  facebook: "",
  instagram: "",
  twitter: "",
  youtube: "",
};

const SPEAKER_TITLES = [
  "Sheikh", "Maulana", "Moulana", "Mufti", "Qari", "Imam",
  "Shaykh", "Ustadh", "Ustadha", "Dr", "Hafiz", "Hafiza", "Custom"
];

const EVENT_TYPES = [
  "Talk / Lecture", "Retreat / Sleepover", "Exhibition",
  "Iftar / Dinner", "Course / Series", "Conference / Jalsa",
  "Fundraiser", "Workshop", "Youth Programme", "Sisters Programme",
  "Quran Competition", "Nasheed Night", "Community Event", "Other"
];

const PRAYER_TIMES = [
  "After Fajr", "After Ishraq", "After Zuhr", "After Asr",
  "After Maghrib", "After Isha Salaah", "Custom Time"
];

const AUDIENCE_OPTIONS = [
  "Brothers Only", "Sisters Only", "Brothers & Sisters",
  "Sisters & Children", "Boys Under 10", "16+", "Open to All",
  "Families Welcome", "Youth Only"
];

const PROGRAMME_ITEMS = [
  "Qiraat", "Nasheeds", "Q&A Session", "Guided Tour",
  "Food Served", "Breakfast Provided", "Indoor Activities",
  "Live Drawing", "Children's Activities", "Discussions",
  "Inspirational Talks", "Eyewitness Accounts", "Speeches",
  "Reminders", "Observe the Muslim Prayer"
];

const ENTRY_OPTIONS = [
  "Free Event", "Free Course", "Ticketed", "Donations Welcome",
  "Registration Required", "Register Now"
];

const THEMES = [
  {
    id: "celestial-gold",
    name: "Celestial Gold",
    desc: "Deep navy + gold Islamic arches + geometric star patterns",
    bg: "linear-gradient(135deg, #0a1628 0%, #1a2744 50%, #0d1b2a 100%)",
    accent: "#d4a843",
    text: "#ffffff",
    preview: "🌙",
    promptStyle: "Deep navy blue background with intricate golden Islamic geometric star patterns. A large golden mihrab (prayer niche) arch frames the content. Golden borders and dividers. Mosque silhouette at the bottom. Rich gold calligraphic styling on the title. Stars scattered in the dark sky above. The overall feel is majestic, celestial, and reverent — like a night sky over a mosque.",
  },
  {
    id: "lantern-glow",
    name: "Lantern Glow",
    desc: "Moody gradient + warm ornate lantern + soft bokeh light",
    bg: "linear-gradient(180deg, #2d1b4e 0%, #4a2c6e 30%, #1a1a3e 100%)",
    accent: "#e8a838",
    text: "#ffffff",
    preview: "🏮",
    promptStyle: "Soft moody purple-to-navy gradient background with a beautifully detailed ornate Islamic brass lantern glowing warmly on the right side, casting soft golden bokeh light across the poster. Gentle leaf shadows in the background. The typography is clean white with warm gold accents. The atmosphere is contemplative and spiritually warm.",
  },
  {
    id: "teal-mosaic",
    name: "Teal Mosaic",
    desc: "Teal geometric Islamic patterns + gold accents + arch frame",
    bg: "linear-gradient(180deg, #0d4f5c 0%, #1a6b7a 40%, #0a3d47 100%)",
    accent: "#d4a843",
    text: "#ffffff",
    preview: "🕌",
    promptStyle: "Rich teal/dark cyan background filled with intricate Islamic geometric mosaic patterns (eight-pointed stars, interlocking shapes). A large golden arch frames the main content area. Gold fork-and-plate motif or crescent moon at the top. Deep navy accents on the lower portion. The design is bold, welcoming, and community-oriented.",
  },
  {
    id: "sacred-earth",
    name: "Sacred Earth",
    desc: "Warm earth tones + watercolor textures + architectural imagery",
    bg: "linear-gradient(180deg, #f5e6c8 0%, #e8d5a8 50%, #d4c090 100%)",
    accent: "#8b6914",
    text: "#2a1f0e",
    preview: "🏛️",
    promptStyle: "Warm beige/parchment background with watercolor paint splashes in earthy gold and olive tones. The Dome of the Rock or a beautiful mosque rendered in watercolor style on the right side. Particles of paint/dust floating in the air. Dark brown/black text. The feel is artistic, cultural, and heritage-focused — like an exhibition poster.",
  },
  {
    id: "midnight-dome",
    name: "Midnight Dome",
    desc: "Dark sky + mosque photography + bold red/yellow accents",
    bg: "linear-gradient(180deg, #0a0a1a 0%, #141428 50%, #0a0a1a 100%)",
    accent: "#e63946",
    text: "#ffffff",
    preview: "✨",
    promptStyle: "Very dark navy/black cinematic background with a stunning photograph of the Dome of the Rock or a grand mosque at night, illuminated with golden light, positioned in the lower half. A dramatic crescent moon in the sky. Bold white title text with striking red and golden yellow accent text. The feel is powerful, dramatic, and visually arresting — like a film poster.",
  },
  {
    id: "noir-gold",
    name: "Noir & Gold",
    desc: "Pure black + diagonal gold stripes + mosque silhouette",
    bg: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)",
    accent: "#c9a84c",
    text: "#ffffff",
    preview: "⚡",
    promptStyle: "Sleek black background with elegant diagonal gold metallic stripes crossing the corners. A mosque/minaret silhouette in the header area. Clean white typography with golden highlighted speaker names. A subtle photograph of a masjid at dusk in the background. The aesthetic is modern, premium, and bold — like a luxury event invitation.",
  },
];

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent";

// ─── PROMPT GENERATOR ──────────────────────────────────────
const generatePrompt = (form: any, theme: string) => {
  const speakerBlock = form.speakers
    .filter((s: any) => s.name.trim())
    .map((s: any) => {
      let line = "";
      if (s.title && s.title !== "Custom") line += s.title + " ";
      if (s.customTitle) line += s.customTitle + " ";
      line += s.name;
      if (s.role) line += ` (${s.role})`;
      return line.trim();
    })
    .join("\n    \u2022 ");

  const programmeBlock = form.programmeItems.map((p: string) => `\u2022 ${p}`).join("  ");
  const audienceBlock = form.audience.join(", ");
  const entryBlock = form.entry || "Free Event";

  const dateStr = form.date || "[Date TBC]";
  const timeStr = form.prayerTime === "Custom Time"
    ? form.customTime || "[Time TBC]"
    : form.prayerTime || "[Time TBC]";
  const timeDisplay = form.specificTime ? `${timeStr} (${form.specificTime})` : timeStr;

  const contactLines: string[] = [];
  if (form.phone) contactLines.push(`Phone: ${form.phone}`);
  if (form.website || MASJID_DEFAULTS.website) contactLines.push(`Website: ${form.website || MASJID_DEFAULTS.website}`);
  if (form.registrationUrl) contactLines.push(`Register: ${form.registrationUrl}`);

  const socialLines: string[] = [];
  if (form.facebook) socialLines.push(`Facebook: ${form.facebook}`);
  if (form.instagram) socialLines.push(`Instagram: ${form.instagram}`);
  if (form.twitter) socialLines.push(`Twitter/X: ${form.twitter}`);
  if (form.youtube) socialLines.push(`YouTube: ${form.youtube}`);

  const selectedTheme = THEMES.find((t) => t.id === theme) || THEMES[0];

  const qrLine = form.qrCodeData ? "\nINCLUDE QR CODE: Place the attached QR code image in the bottom-right area of the poster, clearly visible.\n" : "";

  return `Create a professional Islamic event poster with the following details and visual style.

=== VISUAL STYLE ===
${selectedTheme.promptStyle}

=== POSTER CONTENT (render ALL text accurately) ===

EVENT TITLE (large, prominent, at the top):
    "${form.title || "[Event Title]"}"

${form.subtitle ? `SUBTITLE (smaller, below title):\n    "${form.subtitle}"\n` : ""}${form.partNumber ? `PART/SERIES NUMBER:\n    "${form.partNumber}"\n` : ""}${speakerBlock ? `SPEAKER(S) (prominent, with titles):\n    \u2022 ${speakerBlock}\n` : ""}
DATE & TIME (bold, clearly visible):
    ${dateStr}
    ${timeDisplay}
${form.hijriYear ? `    ${form.hijriYear} AH\n` : ""}
VENUE (with full address):
    ${form.masjidName || MASJID_DEFAULTS.name}
    ${form.address || MASJID_DEFAULTS.address}, ${form.city || MASJID_DEFAULTS.city}, ${form.postcode || MASJID_DEFAULTS.postcode}

${audienceBlock ? `AUDIENCE: ${audienceBlock}\n` : ""}${entryBlock ? `ENTRY: ${entryBlock}\n` : ""}${programmeBlock ? `\nPROGRAMME HIGHLIGHTS:\n    ${programmeBlock}\n` : ""}${contactLines.length ? `\nCONTACT INFO:\n    ${contactLines.join("\n    ")}\n` : ""}${socialLines.length ? `\nSOCIAL MEDIA:\n    ${socialLines.join("\n    ")}\n` : ""}${form.sponsorName ? `\nSPONSOR: ${form.sponsorName}\n` : ""}${qrLine}
=== DESIGN REQUIREMENTS ===
- Portrait orientation (3:4 or 9:16 aspect ratio)
- All text must be legible, correctly spelled, and properly laid out
- Use a clear visual hierarchy: title largest, then speakers, then date/venue, then details
- Include Islamic design elements appropriate to the theme (geometric patterns, arches, crescents, mosque silhouettes)
- The poster should look professionally designed and not cluttered
- Render all English text accurately with no spelling errors
- Text should be crisp and high-contrast against the background`;
};

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function PosterCreator() {
  const [step, setStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // API state
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [genError, setGenError] = useState("");
  const [genThinking, setGenThinking] = useState("");

  const [form, setForm] = useState({
    title: "", subtitle: "", eventType: "", partNumber: "",
    speakers: [{ title: "Maulana", customTitle: "", name: "", role: "" }],
    date: "", prayerTime: "", customTime: "", specificTime: "", hijriYear: "",
    masjidName: MASJID_DEFAULTS.name, address: MASJID_DEFAULTS.address,
    city: MASJID_DEFAULTS.city, postcode: MASJID_DEFAULTS.postcode,
    audience: [] as string[], entry: "Free Event", programmeItems: [] as string[],
    phone: MASJID_DEFAULTS.phone, website: MASJID_DEFAULTS.website,
    email: MASJID_DEFAULTS.email, facebook: MASJID_DEFAULTS.facebook,
    instagram: MASJID_DEFAULTS.instagram, twitter: MASJID_DEFAULTS.twitter,
    youtube: MASJID_DEFAULTS.youtube, registrationUrl: "", sponsorName: "",
    qrCodeData: null as string | null,
    qrCodePreview: null as string | null,
  });

  const [selectedTheme, setSelectedTheme] = useState("celestial-gold");

  const update = useCallback((key: string, val: any) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  const toggleArrayItem = useCallback((key: string, item: string) => {
    setForm((prev: any) => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item] };
    });
  }, []);

  const addSpeaker = () => {
    setForm((prev) => ({
      ...prev,
      speakers: [...prev.speakers, { title: "Maulana", customTitle: "", name: "", role: "" }],
    }));
  };

  const removeSpeaker = (idx: number) => {
    setForm((prev) => ({ ...prev, speakers: prev.speakers.filter((_, i) => i !== idx) }));
  };

  const updateSpeaker = (idx: number, field: string, val: string) => {
    setForm((prev) => {
      const speakers = [...prev.speakers];
      speakers[idx] = { ...speakers[idx], [field]: val };
      return { ...prev, speakers };
    });
  };

  // ─── QR CODE UPLOAD ──────────────────────────────────────
  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Full = ev.target?.result as string;
      const base64Data = base64Full.split(",")[1];
      setForm((prev) => ({ ...prev, qrCodeData: base64Data, qrCodePreview: base64Full }));
    };
    reader.readAsDataURL(file);
  };

  const removeQr = () => {
    setForm((prev) => ({ ...prev, qrCodeData: null, qrCodePreview: null }));
    if (qrInputRef.current) qrInputRef.current.value = "";
  };

  // ─── GEMINI API CALL ─────────────────────────────────────
  const generatePoster = async () => {
    if (!apiKey.trim()) {
      setGenError("VITE_GEMINI_API_KEY is not set. Add it to your .env file and restart the dev server.");
      return;
    }
    setGenerating(true);
    setGenError("");
    setGeneratedImage(null);
    setGenThinking("");

    const prompt = generatePrompt(form, selectedTheme);
    const parts: any[] = [];

    if (form.qrCodeData) {
      parts.push({ inline_data: { mime_type: "image/png", data: form.qrCodeData } });
    }
    parts.push({ text: prompt });

    const body = {
      contents: [{ parts }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    };

    try {
      const res = await fetch(`${GEMINI_API_URL}?key=${apiKey.trim()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error?.message || `API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      if (!data.candidates?.[0]?.content?.parts) {
        throw new Error("No content returned from API. The model may have blocked the request.");
      }

      let foundImage = false;
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData) {
          setGeneratedImage(`data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`);
          foundImage = true;
        } else if (part.text) {
          setGenThinking(part.text);
        }
      }

      if (!foundImage) {
        throw new Error("The model returned text but no image. Try regenerating.");
      }
    } catch (err: any) {
      setGenError(err.message || "Failed to generate image.");
    } finally {
      setGenerating(false);
    }
  };

  // ─── DOWNLOAD ────────────────────────────────────────────
  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    const safeName = (form.title || "masjid-poster").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
    link.download = `${safeName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatedPrompt = generatePrompt(form, selectedTheme);

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(generatedPrompt); } catch {
      const ta = document.createElement("textarea");
      ta.value = generatedPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const steps = [
    { label: "Event", icon: "📋" },
    { label: "Schedule", icon: "📅" },
    { label: "Venue", icon: "🕌" },
    { label: "Details", icon: "📝" },
    { label: "Theme", icon: "🎨" },
    { label: "Generate", icon: "✨" },
  ];

  // ─── SHARED STYLES ───────────────────────────────────────
  const S = {
    container: { minHeight: "100vh", background: "#050a10", color: "#e8e0d4", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif", position: "relative" as const, overflow: "hidden" as const },
    bgPattern: { position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L55 30L30 55L5 30Z' fill='none' stroke='%23d4a843' stroke-width='0.5'/%3E%3Cpath d='M30 15L45 30L30 45L15 30Z' fill='none' stroke='%23d4a843' stroke-width='0.3'/%3E%3C/svg%3E")`, pointerEvents: "none" as const, zIndex: 0 },
    header: { textAlign: "center" as const, padding: "32px 20px 20px", position: "relative" as const, zIndex: 1 },
    title: { fontSize: "28px", fontWeight: 700, background: "linear-gradient(135deg, #d4a843, #f0d78c, #d4a843)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "1px", margin: 0 },
    sub: { fontSize: "13px", color: "#8a8070", marginTop: "6px", letterSpacing: "3px", textTransform: "uppercase" as const },
    stepBar: { display: "flex", justifyContent: "center", gap: "4px", padding: "16px 20px", position: "relative" as const, zIndex: 1, flexWrap: "wrap" as const },
    main: { maxWidth: "680px", margin: "0 auto", padding: "0 20px 40px", position: "relative" as const, zIndex: 1 },
    card: { background: "rgba(18,22,30,0.85)", border: "1px solid rgba(212,168,67,0.15)", borderRadius: "16px", padding: "28px", backdropFilter: "blur(10px)" },
    label: { display: "block", fontSize: "12px", fontWeight: 600, color: "#d4a843", textTransform: "uppercase" as const, letterSpacing: "1.5px", marginBottom: "6px" },
    input: { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: "8px", color: "#e8e0d4", fontSize: "14px", outline: "none", boxSizing: "border-box" as const },
    select: { width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(212,168,67,0.2)", borderRadius: "8px", color: "#e8e0d4", fontSize: "14px", outline: "none", boxSizing: "border-box" as const, cursor: "pointer" },
    chip: { padding: "6px 12px", borderRadius: "20px", fontSize: "12px", cursor: "pointer", transition: "all 0.2s", border: "1px solid", display: "inline-block", margin: "3px" },
    btn: { padding: "8px 14px", borderRadius: "8px", border: "1px solid", fontSize: "12px", cursor: "pointer", transition: "all 0.2s", display: "flex" as const, alignItems: "center" as const, gap: "5px", fontWeight: 500 },
    btnP: { borderColor: "#d4a843", background: "linear-gradient(135deg, #d4a843, #b8922e)", color: "#0a0a0a", fontWeight: 700 },
    btnG: { borderColor: "rgba(212,168,67,0.3)", background: "transparent", color: "#d4a843" },
  };

  const field = (label: string, children: React.ReactNode) => (
    <div style={{ marginBottom: "16px" }}><label style={S.label}>{label}</label>{children}</div>
  );

  const secTitle = (text: string) => (
    <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#d4a843", margin: "20px 0 12px", borderBottom: "1px solid rgba(212,168,67,0.15)", paddingBottom: "8px" }}>{text}</h3>
  );

  const nav = (
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
      {step > 0 ? <button onClick={() => setStep(step - 1)} style={{ ...S.btn, ...S.btnG }}>{"\u2190"} Back</button> : <div />}
      {step < steps.length - 1 ? <button onClick={() => setStep(step + 1)} style={{ ...S.btn, ...S.btnP }}>Next {"\u2192"}</button> : null}
    </div>
  );

  // ─── STEP RENDERERS ──────────────────────────────────────

  const renderStep0 = () => (
    <div style={S.card}>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", color: "#f0d78c" }}>Event Details</h2>
      {field("Event Title *", <input style={S.input} placeholder='e.g. "Siratul Ambiya"' value={form.title} onChange={(e) => update("title", e.target.value)} />)}
      {field("Subtitle / Theme", <input style={S.input} placeholder='e.g. "The Sirah of the Prophets"' value={form.subtitle} onChange={(e) => update("subtitle", e.target.value)} />)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {field("Event Type", <select style={S.select} value={form.eventType} onChange={(e) => update("eventType", e.target.value)}><option value="">Select...</option>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>)}
        {field("Part / Series No.", <input style={S.input} placeholder='e.g. "Part 6"' value={form.partNumber} onChange={(e) => update("partNumber", e.target.value)} />)}
      </div>
      {secTitle("Speakers")}
      {form.speakers.map((sp, idx) => (
        <div key={idx} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(212,168,67,0.1)", borderRadius: "10px", padding: "14px", marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <span style={{ fontSize: "12px", color: "#8a8070" }}>Speaker {idx + 1}</span>
            {form.speakers.length > 1 && <button onClick={() => removeSpeaker(idx)} style={{ background: "none", border: "none", color: "#e63946", cursor: "pointer", fontSize: "18px" }}>{"\u00d7"}</button>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: sp.title === "Custom" ? "120px 120px 1fr" : "120px 1fr", gap: "8px", marginBottom: "8px" }}>
            <select style={{ ...S.select, padding: "8px 10px" }} value={sp.title} onChange={(e) => updateSpeaker(idx, "title", e.target.value)}>{SPEAKER_TITLES.map((t) => <option key={t}>{t}</option>)}</select>
            {sp.title === "Custom" && <input style={{ ...S.input, padding: "8px 10px" }} placeholder="Custom title" value={sp.customTitle} onChange={(e) => updateSpeaker(idx, "customTitle", e.target.value)} />}
            <input style={{ ...S.input, padding: "8px 10px" }} placeholder="Speaker name" value={sp.name} onChange={(e) => updateSpeaker(idx, "name", e.target.value)} />
          </div>
          <input style={{ ...S.input, padding: "8px 10px" }} placeholder="Role — e.g. Imam of Masjid Umar, Sheffield" value={sp.role} onChange={(e) => updateSpeaker(idx, "role", e.target.value)} />
        </div>
      ))}
      <button onClick={addSpeaker} style={{ ...S.btn, ...S.btnG, fontSize: "12px", width: "100%", justifyContent: "center", marginTop: "4px" }}>+ Add Another Speaker</button>
      {nav}
    </div>
  );

  const renderStep1 = () => (
    <div style={S.card}>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", color: "#f0d78c" }}>Date & Time</h2>
      {field("Event Date *", <input style={S.input} placeholder='e.g. "Saturday 18th January 2025"' value={form.date} onChange={(e) => update("date", e.target.value)} />)}
      {field("Prayer Time Reference", <select style={S.select} value={form.prayerTime} onChange={(e) => update("prayerTime", e.target.value)}><option value="">Select...</option>{PRAYER_TIMES.map((t) => <option key={t}>{t}</option>)}</select>)}
      {form.prayerTime === "Custom Time" && field("Custom Time Label", <input style={S.input} placeholder={`e.g. "After Jumu'ah"`} value={form.customTime} onChange={(e) => update("customTime", e.target.value)} />)}
      {field("Specific Clock Time", <input style={S.input} placeholder='e.g. "6:30PM"' value={form.specificTime} onChange={(e) => update("specificTime", e.target.value)} />)}
      {field("Hijri Year (optional)", <input style={S.input} placeholder='e.g. "1446"' value={form.hijriYear} onChange={(e) => update("hijriYear", e.target.value)} />)}
      {nav}
    </div>
  );

  const renderStep2 = () => (
    <div style={S.card}>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", color: "#f0d78c" }}>Venue</h2>
      <p style={{ fontSize: "12px", color: "#8a8070", marginBottom: "16px" }}>Defaults to Masjid Irshad, Luton.</p>
      {field("Masjid / Venue Name", <input style={S.input} value={form.masjidName} onChange={(e) => update("masjidName", e.target.value)} />)}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
        {field("Address", <input style={S.input} value={form.address} onChange={(e) => update("address", e.target.value)} />)}
        {field("Postcode", <input style={S.input} value={form.postcode} onChange={(e) => update("postcode", e.target.value)} />)}
      </div>
      {field("City", <input style={S.input} value={form.city} onChange={(e) => update("city", e.target.value)} />)}
      <button onClick={() => { update("masjidName", MASJID_DEFAULTS.name); update("address", MASJID_DEFAULTS.address); update("city", MASJID_DEFAULTS.city); update("postcode", MASJID_DEFAULTS.postcode); }} style={{ ...S.btn, borderColor: "rgba(212,168,67,0.3)", background: "transparent", color: "#8a8070", fontSize: "11px", marginTop: "4px" }}>{"\u21ba"} Reset to Masjid Irshad defaults</button>
      {nav}
    </div>
  );

  const renderStep3 = () => (
    <div style={S.card}>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", color: "#f0d78c" }}>Audience, Programme & Contact</h2>

      {secTitle("Audience")}
      <div style={{ marginBottom: "16px" }}>
        {AUDIENCE_OPTIONS.map((a) => <span key={a} onClick={() => toggleArrayItem("audience", a)} style={{ ...S.chip, background: form.audience.includes(a) ? "rgba(212,168,67,0.2)" : "transparent", borderColor: form.audience.includes(a) ? "#d4a843" : "rgba(212,168,67,0.15)", color: form.audience.includes(a) ? "#f0d78c" : "#8a8070" }}>{a}</span>)}
      </div>

      {field("Entry", <select style={S.select} value={form.entry} onChange={(e) => update("entry", e.target.value)}>{ENTRY_OPTIONS.map((o) => <option key={o}>{o}</option>)}</select>)}

      {secTitle("Programme Highlights")}
      <div style={{ marginBottom: "16px" }}>
        {PROGRAMME_ITEMS.map((p) => <span key={p} onClick={() => toggleArrayItem("programmeItems", p)} style={{ ...S.chip, background: form.programmeItems.includes(p) ? "rgba(212,168,67,0.2)" : "transparent", borderColor: form.programmeItems.includes(p) ? "#d4a843" : "rgba(212,168,67,0.15)", color: form.programmeItems.includes(p) ? "#f0d78c" : "#8a8070" }}>{p}</span>)}
      </div>

      {secTitle("QR Code")}
      <div style={{ marginBottom: "16px" }}>
        <p style={{ fontSize: "12px", color: "#8a8070", marginBottom: "10px" }}>Upload a QR code image to include on the poster.</p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ ...S.btn, ...S.btnG, cursor: "pointer", display: "inline-flex" }}>
            {form.qrCodePreview ? "Replace QR" : "Upload QR Code"}
            <input ref={qrInputRef} type="file" accept="image/*" onChange={handleQrUpload} style={{ display: "none" }} />
          </label>
          {form.qrCodePreview && <button onClick={removeQr} style={{ ...S.btn, borderColor: "#e63946", background: "transparent", color: "#e63946", fontSize: "11px" }}>Remove</button>}
        </div>
        {form.qrCodePreview && (
          <div style={{ marginTop: "12px", display: "inline-block", background: "#fff", padding: "8px", borderRadius: "8px" }}>
            <img src={form.qrCodePreview} alt="QR Code" style={{ width: "100px", height: "100px", objectFit: "contain", display: "block" }} />
          </div>
        )}
      </div>

      {secTitle("Contact & Registration")}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {field("Phone", <input style={S.input} placeholder="e.g. 07802 888 661" value={form.phone} onChange={(e) => update("phone", e.target.value)} />)}
        {field("Website", <input style={S.input} value={form.website} onChange={(e) => update("website", e.target.value)} />)}
      </div>
      {field("Registration URL", <input style={S.input} placeholder="e.g. bit.ly/mni-spiritual-retreat" value={form.registrationUrl} onChange={(e) => update("registrationUrl", e.target.value)} />)}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {field("Facebook", <input style={S.input} placeholder="/YourPage" value={form.facebook} onChange={(e) => update("facebook", e.target.value)} />)}
        {field("Instagram", <input style={S.input} placeholder="@YourHandle" value={form.instagram} onChange={(e) => update("instagram", e.target.value)} />)}
        {field("Twitter / X", <input style={S.input} placeholder="@YourHandle" value={form.twitter} onChange={(e) => update("twitter", e.target.value)} />)}
        {field("YouTube", <input style={S.input} placeholder="/YourChannel" value={form.youtube} onChange={(e) => update("youtube", e.target.value)} />)}
      </div>
      {field("Sponsor Name (optional)", <input style={S.input} placeholder="e.g. Regal Furniture" value={form.sponsorName} onChange={(e) => update("sponsorName", e.target.value)} />)}
      {nav}
    </div>
  );

  const renderStep4 = () => (
    <div style={S.card}>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", color: "#f0d78c" }}>Choose a Theme</h2>
      <p style={{ fontSize: "13px", color: "#8a8070", marginBottom: "20px" }}>Select a visual style inspired by real masjid poster designs.</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {THEMES.map((t) => (
          <div key={t.id} onClick={() => setSelectedTheme(t.id)} style={{ background: t.bg, border: selectedTheme === t.id ? `2px solid ${t.accent}` : "2px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "18px 14px", cursor: "pointer", transition: "all 0.25s", transform: selectedTheme === t.id ? "scale(1.02)" : "scale(1)", position: "relative", overflow: "hidden" }}>
            {selectedTheme === t.id && <div style={{ position: "absolute", top: "8px", right: "10px", background: t.accent, color: "#0a0a0a", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700 }}>{"\u2713"}</div>}
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>{t.preview}</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: t.text, marginBottom: "4px" }}>{t.name}</div>
            <div style={{ fontSize: "11px", color: t.text, opacity: 0.7, lineHeight: 1.3 }}>{t.desc}</div>
          </div>
        ))}
      </div>
      {nav}
    </div>
  );

  const renderStep5 = () => {
    const theme = THEMES.find((t) => t.id === selectedTheme) || THEMES[0];
    return (
      <div style={S.card}>
        <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#f0d78c" }}>Generate Poster</h2>

        {/* Summary */}
        <div style={{ background: theme.bg, border: `1px solid ${theme.accent}40`, borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "2px", color: theme.accent, marginBottom: "12px" }}>Poster Summary</div>
          <div style={{ fontSize: "20px", fontWeight: 700, color: theme.text, marginBottom: "4px" }}>{form.title || "Untitled Event"}</div>
          {form.subtitle && <div style={{ fontSize: "14px", color: theme.text, opacity: 0.8, marginBottom: "8px" }}>{form.subtitle}</div>}
          {form.speakers.filter((s) => s.name).map((s, i) => <div key={i} style={{ fontSize: "13px", color: theme.accent, marginBottom: "2px" }}>{s.title !== "Custom" ? s.title : s.customTitle} {s.name} {s.role && `\u2014 ${s.role}`}</div>)}
          <div style={{ fontSize: "13px", color: theme.text, opacity: 0.9, marginTop: "10px" }}>{form.date || "Date TBC"} {"\u00b7"} {form.prayerTime || "Time TBC"} {form.specificTime && `(${form.specificTime})`}</div>
          <div style={{ fontSize: "12px", color: theme.text, opacity: 0.7, marginTop: "4px" }}>{form.masjidName}, {form.address}, {form.city}, {form.postcode}</div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "10px", alignItems: "center" }}>
            {form.audience.map((a) => <span key={a} style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "10px", background: `${theme.accent}30`, color: theme.accent }}>{a}</span>)}
            {form.entry && <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "10px", background: `${theme.accent}30`, color: theme.accent }}>{form.entry}</span>}
            {form.qrCodePreview && <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "10px", background: `${theme.accent}30`, color: theme.accent }}>QR Code {"\u2713"}</span>}
          </div>
          <div style={{ fontSize: "10px", marginTop: "8px", color: theme.text, opacity: 0.5 }}>Theme: {theme.name} {theme.preview}</div>
        </div>

        {/* API Key status */}
        <div style={{ marginBottom: "20px", padding: "12px", background: apiKey ? "rgba(40,167,69,0.08)" : "rgba(230,57,70,0.08)", border: `1px solid ${apiKey ? "rgba(40,167,69,0.3)" : "rgba(230,57,70,0.3)"}`, borderRadius: "8px" }}>
          <div style={{ fontSize: "12px", color: apiKey ? "#28a745" : "#e63946", fontWeight: 600 }}>
            {apiKey ? "\u2713 Gemini API key loaded from environment" : "\u2717 VITE_GEMINI_API_KEY not set in .env"}
          </div>
          {!apiKey && <p style={{ fontSize: "11px", color: "#8a8070", margin: "6px 0 0", lineHeight: 1.5 }}>Add <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>VITE_GEMINI_API_KEY=your_key</code> to your <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>.env</code> file and restart the dev server. Get a free key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#d4a843" }}>Google AI Studio</a>.</p>}
        </div>

        {/* Generate button */}
        <button onClick={generatePoster} disabled={generating} style={{ ...S.btn, width: "100%", justifyContent: "center", fontSize: "14px", padding: "14px", ...S.btnP, opacity: generating ? 0.6 : 1, cursor: generating ? "not-allowed" : "pointer", marginBottom: "16px" }}>
          {generating ? "\u23f3 Generating..." : generatedImage ? "\ud83d\udd04 Regenerate Poster" : "\ud83c\udfa8 Generate Poster"}
        </button>

        {/* Error */}
        {genError && <div style={{ background: "rgba(230,57,70,0.1)", border: "1px solid rgba(230,57,70,0.3)", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "13px", color: "#e63946" }}>{genError}</div>}

        {/* Loading */}
        {generating && (
          <div style={{ textAlign: "center", padding: "40px 20px", marginBottom: "16px" }}>
            <style>{`@keyframes nbspin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } @keyframes nbpulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
            <div style={{ fontSize: "48px", marginBottom: "16px", animation: "nbspin 2s linear infinite" }}>{"\ud83d\udd4c"}</div>
            <div style={{ fontSize: "14px", color: "#d4a843", animation: "nbpulse 1.5s ease-in-out infinite" }}>Your poster is being generated...</div>
            <div style={{ fontSize: "12px", color: "#5a5040", marginTop: "8px" }}>This may take 15{"\u201345"} seconds</div>
          </div>
        )}

        {/* Model thinking text */}
        {genThinking && !generating && (
          <div style={{ background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#d4a843", fontWeight: 600, marginBottom: "4px" }}>Model Notes</div>
            <div style={{ fontSize: "12px", color: "#8a8070", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{genThinking}</div>
          </div>
        )}

        {/* Generated Image */}
        {generatedImage && (
          <div style={{ marginBottom: "20px" }}>
            <div style={{ border: "2px solid rgba(212,168,67,0.3)", borderRadius: "12px", overflow: "hidden", marginBottom: "12px" }}>
              <img src={generatedImage} alt="Generated poster" style={{ width: "100%", display: "block" }} />
            </div>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={downloadImage} style={{ ...S.btn, flex: 1, justifyContent: "center", ...S.btnP, fontSize: "13px", padding: "12px" }}>{"\u2b07"} Download Poster</button>
              <button onClick={generatePoster} disabled={generating} style={{ ...S.btn, flex: 1, justifyContent: "center", ...S.btnG, fontSize: "13px", padding: "12px" }}>{"\ud83d\udd04"} Regenerate</button>
            </div>
          </div>
        )}

        {/* Manual prompt fallback */}
        <div style={{ borderTop: "1px solid rgba(212,168,67,0.1)", margin: "20px 0", position: "relative" }}>
          <span style={{ position: "absolute", top: "-10px", left: "50%", transform: "translateX(-50%)", background: "rgba(18,22,30,0.85)", padding: "0 12px", fontSize: "11px", color: "#5a5040" }}>or copy prompt manually</span>
        </div>
        <details style={{ marginBottom: "16px" }}>
          <summary style={{ fontSize: "13px", color: "#8a8070", cursor: "pointer", padding: "8px 0" }}>View generated prompt</summary>
          <div style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(212,168,67,0.15)", borderRadius: "10px", padding: "16px", maxHeight: "300px", overflowY: "auto", marginTop: "8px" }}>
            <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "11px", lineHeight: 1.6, color: "#c8c0b4", fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace" }}>{generatedPrompt}</pre>
          </div>
        </details>
        <button onClick={copyPrompt} style={{ ...S.btn, ...S.btnG, width: "100%", justifyContent: "center", fontSize: "12px", padding: "10px" }}>{copied ? "\u2713 Copied!" : "\ud83d\udccb Copy Prompt to Clipboard"}</button>

        <div style={{ display: "flex", justifyContent: "flex-start", marginTop: "20px" }}>
          <button onClick={() => setStep(0)} style={{ ...S.btn, borderColor: "rgba(212,168,67,0.3)", background: "transparent", color: "#8a8070", fontSize: "12px" }}>{"\u2190"} Edit Details</button>
        </div>
      </div>
    );
  };

  const renderCurrentStep = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5][step];

  return (
    <div style={S.container}>
      <div style={S.bgPattern} />
      <header style={S.header}>
        <div style={{ fontSize: "32px", marginBottom: "4px" }}>{"\ud83d\udd4c"}</div>
        <h1 style={S.title}>Masjid Poster Creator</h1>
      </header>
      <nav style={S.stepBar}>
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i)} style={{ ...S.btn, borderColor: i === step ? "#d4a843" : "rgba(212,168,67,0.15)", background: i === step ? "rgba(212,168,67,0.15)" : "transparent", color: i === step ? "#f0d78c" : i < step ? "#d4a843" : "#5a5040" }}>
            <span>{s.icon}</span><span>{s.label}</span>
          </button>
        ))}
      </nav>
      <main style={S.main}>{renderCurrentStep()}</main>
      <footer style={{ textAlign: "center", padding: "20px", fontSize: "11px", color: "#3a3530", position: "relative", zIndex: 1 }}>Masjid Irshad {"\u00b7"} masjidirshad.co.uk {"\u00b7"} Built for the Ummah</footer>
    </div>
  );
}
