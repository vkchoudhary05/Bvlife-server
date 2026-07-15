import { db } from "../dbManager.js";
import { GoogleGenAI } from "@google/genai";
// Lazy initialize Gemini client
let aiClient = null;
function getAI() {
    if (!aiClient) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn("GEMINI_API_KEY is not defined. AI Consultations will fallback to expert local heuristic responses.");
            return null;
        }
        aiClient = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
                headers: {
                    'User-Agent': 'aistudio-build',
                }
            }
        });
    }
    return aiClient;
}
export const consult = async (req, res) => {
    const { symptoms, bodyType, lifestyle, query, lang } = req.body;
    if (!symptoms && !query) {
        return res.status(400).json({ error: "Please enter your symptoms, questions or select your body constitution details." });
    }
    const ai = getAI();
    if (!ai) {
        // Elegant expert fallback response when Gemini key is missing
        const doshaGuesses = ["Vata-Pitta blend", "Kapha dominance", "Pitta energy"];
        const chosenDosha = bodyType || doshaGuesses[Math.floor(Math.random() * doshaGuesses.length)];
        let advice = "Based on our ancient wisdom, we highly recommend focusing on warming, easily-digestible meals. Drink warm cumin water throughout the day, and consider adding Chyawanprash for lung strength and Ashwagandha to calm cortisol. Ensure you maintain regular sleep cycles.";
        if (symptoms?.toLowerCase().includes("digestion") || symptoms?.toLowerCase().includes("stomach") || symptoms?.toLowerCase().includes("gas")) {
            advice = "For your digestive symptoms, Ayurveda suggests a delicate cleanse. Consuming Triphala powder in warm water before bed is deeply restorative. Avoid ice-cold beverages, chew a pinch of fennel seeds after meals, and prefer cooked vegetables over raw salads.";
        }
        else if (symptoms?.toLowerCase().includes("hair") || symptoms?.toLowerCase().includes("dandruff")) {
            advice = "For hair thinning and root health, Ayurveda recommends regular scalp stimulation. Use Brahmi & Bhringraj Hair Therapy Oil. Massage gently to stimulate hair follicles, and consume amla (gooseberries) rich in vitamin C daily.";
        }
        else if (symptoms?.toLowerCase().includes("skin") || symptoms?.toLowerCase().includes("glowing")) {
            advice = "To balance skin blemishes and restore radiant color, Ayurveda loves Kesar (saffron) and Sandalwood. Apply Kumkumadi Night Elixir Serum. Protect your liver with light, bitter foods and stay well-hydrated.";
        }
        if (lang === 'hi') {
            advice = "हमारे प्राचीन ज्ञान के अनुसार, हम गर्म और आसानी से पचने वाले भोजन पर ध्यान केंद्रित करने की दृढ़ता से सलाह देते हैं। दिनभर गुनगुना जीरा पानी पिएं, और फेफड़ों की ताकत के लिए च्यवनप्राश और तनाव को शांत करने के लिए अश्वगंधा लेने पर विचार करें। नियमित नींद चक्र बनाए रखें।";
            if (symptoms?.toLowerCase().includes("digestion") || symptoms?.toLowerCase().includes("stomach") || symptoms?.toLowerCase().includes("gas")) {
                advice = "आपके पाचन संबंधी लक्षणों के लिए, आयुर्वेद एक नाजुक सफाई का सुझाव देता है। सोने से पहले गर्म पानी में त्रिफला चूर्ण का सेवन करना बहुत फायदेमंद होता है। ठंडे पेय पदार्थों से बचें, भोजन के बाद सौंफ चबाएं, और कच्ची सलाद की तुलना में पकी हुई सब्जियों को प्राथमिकता दें।";
            }
            else if (symptoms?.toLowerCase().includes("hair") || symptoms?.toLowerCase().includes("dandruff")) {
                advice = "बालों के झड़ने और जड़ों के स्वास्थ्य के लिए, आयुर्वेद नियमित सिर की मालिश की सलाह देता है। ब्राह्मी और भृंगराज हेयर थेरेपी तेल का उपयोग करें। बालों के रोमों को उत्तेजित करने के लिए धीरे-धीरे मालिश करें, और दैनिक रूप से विटामिन सी से भरपूर आंवले का सेवन करें।";
            }
            else if (symptoms?.toLowerCase().includes("skin") || symptoms?.toLowerCase().includes("glowing")) {
                advice = "त्वचा के धब्बों को संतुलित करने और चमक वापस लाने के लिए, आयुर्वेद केसर और चंदन को पसंद करता है। कुंकुमादि नाइट एलिक्सिर सीरम लगाएं। हल्के, कड़वे खाद्य पदार्थों के साथ अपने लीवर की रक्षा करें और अच्छी तरह से हाइड्रेटेड रहें।";
            }
            const fallbackResponseHi = `
### 🌿 गहन स्वास्थ्य परामर्श (आचार्य विश्लेषण)

**जैविक शारीरिक प्रकृति (दोष विश्लेषण):** ${chosenDosha === 'Vata' ? 'वात दोष' : chosenDosha === 'Pitta' ? 'पित्त दोष' : chosenDosha === 'Kapha' ? 'कफ दोष' : 'मिश्रित त्रिदोष विश्लेषण'}
**दर्ज किए गए लक्षण:** ${symptoms || "सामान्य स्वास्थ्य पूछताछ"}
**जीवनशैली का स्वरूप:** ${lifestyle || "मध्यम शारीरिक गतिविधि"}

---

#### 🧘 पारंपरिक आयुर्वेदिक मार्गदर्शन और अवलोकन
नमस्ते, स्वास्थ्य के आकांक्षी साधक। आपके लक्षण आपके शरीर के जैविक तत्वों (दोषों) में हल्के असंतुलन की ओर संकेत करते हैं। ${advice}

#### 📦 कस्टम कल्याण अनुशंसाएं (ग्राम्स लाइफ औषधालय)
1. **गोल्डन च्यवनप्राश (Golden Chyawanprash)** - (प्रतिरोधक क्षमता और ऊर्जा के समर्थन के लिए)
2. **त्रिफला पाचक चूर्ण (Triphala Digestive Cleanse)** - (पाचन अग्नि को प्रज्वलित करने और आंतों की विषाक्तता को दूर करने के लिए)
3. **शुद्ध अश्वगंधा KSM-66 (Pure Ashwagandha)** - (दैनिक तनाव को दूर करने और सेलुलर रिकवरी के लिए)

*अस्वीकरण (Disclaimer): ग्राम्स लाइफ आयुर्वेदिक अंतर्दृष्टि केवल पारंपरिक टिप्पणियां हैं। नैदानिक ​​उपचार के लिए कृपया अपने चिकित्सक से परामर्श लें।*
      `;
            return res.json({ consultation: fallbackResponseHi.trim() });
        }
        const fallbackResponse = `
### 🌿 Deep Wellness Consultation (Aacharya Heuristic Analysis)

**Biological Constitution (Dosha Analyzed):** ${chosenDosha}
**Symptoms Logged:** ${symptoms || "General enquiry"}
**Lifestyle Pattern:** ${lifestyle || "Moderate activity"}

---

#### 🧘 Traditional Guidance & Observations
Hello, beloved wellness seeker. Your symptoms point to a mild imbalance in your body's vital bio-elements. ${advice}

#### 📦 Custom Wellness Recommendations (Grams Life Pharmacy)
1. **Golden Chyawanprash** (For Immunity & Stamina support)
2. **Triphala Organic Digestive Cleanse** (For cleansing digestive Agni and removing toxins)
3. **Pure Ashwagandha KSM-66** (To reduce daily fatigue and eliminate cellular stress)

*Disclaimer: Grams Life Ayurvedic insights are traditional observations. Please consult your personal physician for clinical diagnostics.*
    `;
        return res.json({ consultation: fallbackResponse.trim() });
    }
    try {
        let languageInstruction = "";
        if (lang === 'hi') {
            languageInstruction = "CRITICAL: You must write the entire consultation response fully in Hindi (using clear, fluent Devanagari script) with clean markdown headings. Address the customer as 'प्रिय साधक'. Use warm Hindi vocabulary like 'प्रणाम', 'असंतुलन', 'आहार-विहार', 'जड़ी-बूटी', 'अस्वीकरण'. Use cautious language such as 'यह संकेत दे सकता है' (may indicate), 'इससे संबंधित हो सकता है' (could be related to), 'लाभ उठा सकते हैं' (might benefit from). Ensure you recommend only products from the official BV Life catalog listed below by their exact name in bold.";
        }
        else {
            languageInstruction = "Write the consultation response in English. Address the customer as a seeker of wellness. Use cautious language such as 'may indicate', 'could be related to', 'might benefit from'. Recommend only products from the official BV Life catalog listed below by their exact name in bold.";
        }
        const productsList = db.getProducts().map(p => `- Name: "${p.name}", Category: "${p.category}", Price: ₹${p.price}, Description: "${p.description || ''}"`).join('\n');
        const prompt = `
You are the **BV Life AI Wellness Guide**, an intelligent and deeply compassionate Ayurvedic wellness assistant. 
Your role is to help users choose suitable Ayurvedic products based on their wellness goals and symptoms.

Here is the exact catalog of BV Life products available in our apothecary:
${productsList}

CRITICAL RULES:
1. Never claim to diagnose diseases, prescribe medicines, or replace a doctor. Always explain that your recommendations are educational and wellness-oriented.
2. If symptoms described by the user include chest pain, severe breathing difficulty, loss of consciousness, heavy bleeding, severe allergic reaction, suicidal thoughts, or other emergency warning signs, immediately halt any product recommendations and strongly advise seeking urgent medical care instead.
3. Identify possible Ayurvedic wellness imbalances (Vata, Pitta, Kapha) using cautious language:
   - "may indicate"
   - "could be related to"
   - "might benefit from"
4. Recommend products ONLY from our official catalog above (such as "Golden Chyawanprash - Saffron & Wild Honey", "Pure Ashwagandha KSM-66 Capsules", etc.) using their exact names in bold so the client UI can parse and display them.
5. For each recommended product, provide:
   • Product name
   • Why it may help
   • Key herbs
   • Recommended usage
   • Precautions
6. Then recommend:
   • Foods to eat
   • Foods to avoid
   • Daily routine
   • Yoga
   • Breathing exercises
   • Sleep advice
   • Hydration advice
7. You MUST end your response with this exact disclaimer block:
"These recommendations are intended for general wellness support and are not a medical diagnosis. Please consult a qualified healthcare professional for persistent, severe, or concerning symptoms."

Customer input profiles:
- Symptoms described: ${symptoms || "Not provided"}
- Self-assessed Body Type / Dominant Dosha: ${bodyType || "Undetermined"}
- Lifestyle Details: ${lifestyle || "Not provided"}
- Customer Specific Question/Request: ${query || "Provide a holistic regime."}

${languageInstruction}

Please output a beautifully formatted, comprehensive Ayurvedic Consultation using clean markdown. Use appropriate headings and lists.
`;
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
                systemInstruction: "You are the BV Life AI Wellness Guide, an intelligent Ayurvedic wellness assistant. Your recommendations are educational and wellness-oriented.",
                temperature: 0.7
            }
        });
        res.json({ consultation: response.text });
    }
    catch (error) {
        console.error("Gemini API call failed:", error);
        res.status(500).json({ error: "Our digital Guide is meditating. Please try again in a few moments." });
    }
};
export const getHistory = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const email = authHeader.split(" ")[1]?.toLowerCase();
    const history = db.getChatHistory(email);
    res.json({ messages: history });
};
export const clearHistory = (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    const email = authHeader.split(" ")[1]?.toLowerCase();
    db.clearChatHistory(email);
    res.json({ message: "Chat history cleared successfully." });
};
export const chat = async (req, res) => {
    const { messages, lang } = req.body;
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "No chat history provided." });
    }
    // Check if an authenticated user is chatting to save history
    const authHeader = req.headers.authorization;
    let userEmail = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        userEmail = authHeader.split(" ")[1]?.toLowerCase();
    }
    const ai = getAI();
    if (!ai) {
        // Elegant expert fallback response when Gemini key is missing
        const lastUserMessage = messages[messages.length - 1]?.content || "";
        let reply = "Welcome to BV Life AI Wellness Guide! To help me suggest the most suitable Ayurvedic products, could you tell me your age and gender?";
        const userMsgLower = lastUserMessage.toLowerCase();
        if (userMsgLower.includes("acidity") || userMsgLower.includes("digestion") || userMsgLower.includes("stomach") || userMsgLower.includes("gas") || userMsgLower.includes("bloat") || userMsgLower.includes("acid")) {
            reply = "For digestive fire (Agni) balance, I recommend taking Triphala Organic Digestive Cleanse Churna. Consume 1/2 teaspoon with lukewarm water before sleeping. Avoid chilled food and raw salads. These recommendations are intended for general wellness support and are not a medical diagnosis. Please consult a qualified healthcare professional for persistent, severe, or concerning symptoms.";
        }
        else if (userMsgLower.includes("skin") || userMsgLower.includes("glow") || userMsgLower.includes("pimple") || userMsgLower.includes("face") || userMsgLower.includes("bright")) {
            reply = "To bring natural luster (Tejas) to your skin, I suggest our luxury Kumkumadi Night Elixir Serum. Apply 3-4 drops after washing your face with lukewarm water at night. These recommendations are intended for general wellness support and are not a medical diagnosis. Please consult a qualified healthcare professional for persistent, severe, or concerning symptoms.";
        }
        else if (userMsgLower.includes("hair") || userMsgLower.includes("fall") || userMsgLower.includes("dandruff") || userMsgLower.includes("scalp") || userMsgLower.includes("haircare")) {
            reply = "For hair root nourishment and mental calmness, Brahmi & Bringraj Hair Therapy Oil is exceptional. Warm the oil slightly and massage gently into the scalp in circular motions twice a week. These recommendations are intended for general wellness support and are not a medical diagnosis. Please consult a qualified healthcare professional for persistent, severe, or concerning symptoms.";
        }
        else if (userMsgLower.includes("stress") || userMsgLower.includes("sleep") || userMsgLower.includes("fatigue") || userMsgLower.includes("tired") || userMsgLower.includes("anxiety")) {
            reply = "To soothe your nervous system (Prana Vata) and improve sleep quality, Pure Ashwagandha KSM-66 Capsules work wonders. Take one capsule with warm milk or water in the evening. These recommendations are intended for general wellness support and are not a medical diagnosis. Please consult a qualified healthcare professional for persistent, severe, or concerning symptoms.";
        }
        else if (userMsgLower.includes("immunity") || userMsgLower.includes("cough") || userMsgLower.includes("cold") || userMsgLower.includes("strength") || userMsgLower.includes("energy")) {
            reply = "To bolster your physical strength (Ojas) and immune defense, our signature Golden Chyawanprash - Saffron & Wild Honey is highly effective. Take 1 tablespoon daily on an empty stomach. These recommendations are intended for general wellness support and are not a medical diagnosis. Please consult a qualified healthcare professional for persistent, severe, or concerning symptoms.";
        }
        if (lang === 'hi') {
            reply = "बीवी लाइफ एआई वेलनेस गाइड (BV Life AI Wellness Guide) में आपका स्वागत है! आपकी शारीरिक प्रकृति और स्वास्थ्य लक्ष्यों के अनुसार सर्वोत्तम आयुर्वेदिक उपाय सुझाने के लिए, क्या मैं आपकी आयु (Age) और लिंग (Gender) जान सकता हूँ?";
            if (userMsgLower.includes("acidity") || userMsgLower.includes("digestion") || userMsgLower.includes("stomach") || userMsgLower.includes("gas") || userMsgLower.includes("bloat") || userMsgLower.includes("acid")) {
                reply = "पाचन क्रिया (अग्नि) को संतुलित करने के लिए, मैं त्रिफला पाचक चूर्ण (Triphala Organic Digestive Cleanse Churna) की सलाह देता हूं। रात को सोने से पहले आधा चम्मच गुनगुने पानी के साथ लें। ये सिफारिशें सामान्य कल्याण सहायता के लिए हैं और कोई चिकित्सा निदान नहीं हैं। कृपया गंभीर लक्षणों के लिए एक योग्य स्वास्थ्य देखभाल पेशेवर से परामर्श लें।";
            }
            else if (userMsgLower.includes("skin") || userMsgLower.includes("glow") || userMsgLower.includes("pimple") || userMsgLower.includes("face") || userMsgLower.includes("bright")) {
                reply = "आपकी त्वचा में प्राकृतिक चमक (तेजस) लाने के लिए, मैं हमारे प्रीमियम कुंकुमादि नाइट एलिक्सिर सीरम (Kumkumadi Night Elixir Serum) की सलाह देता हूं। ये सिफारिशें सामान्य कल्याण सहायता के लिए हैं और कोई चिकित्सा निदान नहीं हैं। कृपया गंभीर लक्षणों के लिए एक योग्य स्वास्थ्य देखभाल पेशेवर से परामर्श लें।";
            }
            else if (userMsgLower.includes("stress") || userMsgLower.includes("sleep") || userMsgLower.includes("fatigue") || userMsgLower.includes("tired") || userMsgLower.includes("anxiety")) {
                reply = "तंत्रिका तंत्र (प्राण वात) को शांत करने और गहरी नींद के लिए शुद्ध अश्वगंधा (Pure Ashwagandha KSM-66) कैप्सूल बहुत गुणकारी है। शाम को गुनगुने दूध या पानी के साथ एक कैप्सूल लें। ये सिफारिशें सामान्य कल्याण सहायता के लिए हैं और कोई चिकित्सा निदान नहीं हैं। कृपया गंभीर लक्षणों के लिए एक योग्य स्वास्थ्य देखभाल पेशेवर से परामर्श लें।";
            }
        }
        if (userEmail) {
            db.saveChatHistory(userEmail, [
                ...messages,
                { role: 'assistant', content: reply }
            ]);
        }
        return res.json({ reply });
    }
    try {
        const productsList = db.getProducts().map(p => `- Name: "${p.name}", Category: "${p.category}", Price: ₹${p.price}, Description: "${p.description || ''}"`).join('\n');
        let languageInstruction = "";
        if (lang === 'hi') {
            languageInstruction = "CRITICAL: You must reply fully in Hindi (using clear, Devanagari script) with clean markdown formatting. Address the customer as 'साधक' or 'प्रिय साधक'. Use beautiful Vedic words. Under any circumstances, when recommending remedies, recommend our official BV Life catalog products by their exact names. Always end the final report with the exact Hindi translation of the required disclaimer.";
        }
        else {
            languageInstruction = "Reply in warm, supportive English. Adopt the persona of the BV Life AI Wellness Guide.";
        }
        const systemInstruction = `
You are the **BV Life AI Wellness Guide**, an intelligent and deeply caring Ayurvedic wellness assistant.
Your role is to help users choose suitable Ayurvedic products based on their wellness goals and symptoms.

Here is the exact catalog of BV Life products available in our apothecary:
${productsList}

CRITICAL OPERATIONAL RULES:
1. Never claim to diagnose diseases, prescribe medicines, or replace a doctor. Always explain that your recommendations are educational and wellness-oriented.
2. Start by greeting the user warmly and asking **one question at a time**. Keep the interaction extremely natural and conversational.
3. You must collect information step-by-step including:
   • Age
   • Gender
   • Height and weight
   • Main wellness goal
   • Current symptoms
   • Duration of symptoms
   • Stress level
   • Sleep quality
   • Energy level
   • Digestion
   • Appetite
   • Water intake
   • Exercise routine
   • Existing medical conditions
   • Current medications
   • Allergies
   • Pregnancy or breastfeeding
   • Smoking or alcohol habits
   • Dietary preference (Vegetarian/Non-Vegetarian)
   
   If the user has already provided some of this information, do not ask for those parts again. Acknowledge what they shared and move on to the next missing question, asking ONLY one question at a time. Do not present a massive form or ask for multiple unrelated data points at once.
   
4. **Emergency Check**: If the user's symptoms include chest pain, severe breathing difficulty, loss of consciousness, heavy bleeding, severe allergic reaction, suicidal thoughts, or other emergency warning signs, immediately stop collecting information and do not recommend products. Advise them clearly and urgently to seek immediate, emergency medical care.

5. **Diagnostic Conclusion & Recommendation**:
   Once you have gathered enough information (all 19 points, or if the user asks you to skip and give recommendations directly, or insists on ending the intake):
   
   A. Provide a comprehensive summary of all responses gathered.
   B. Identify possible Ayurvedic wellness imbalances (Vata, Pitta, or Kapha) using cautious language:
      - "may indicate"
      - "could be related to"
      - "might benefit from"
   C. Recommend products ONLY from our official BV Life catalog above (recommend them using their EXACT names in **bold**).
      For each product, provide:
      • Product name
      • Why it may help
      • Key herbs
      • Recommended usage
      • Precautions
   D. Then recommend:
      • Foods to eat
      • Foods to avoid
      • Daily routine
      • Yoga
      • Breathing exercises
      • Sleep advice
      • Hydration advice
   E. You MUST end this final recommendation (and any concluding response) with this exact sentence:
      "These recommendations are intended for general wellness support and are not a medical diagnosis. Please consult a qualified healthcare professional for persistent, severe, or concerning symptoms."

6. Keep all conversational turns warm, highly readable, clear, and well-spaced using markdown.
7. ${languageInstruction}
`;
        const formattedContents = messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: formattedContents,
            config: {
                systemInstruction,
                temperature: 0.7
            }
        });
        const replyText = response.text || "";
        if (userEmail) {
            db.saveChatHistory(userEmail, [
                ...messages,
                { role: 'assistant', content: replyText }
            ]);
        }
        res.json({ reply: replyText });
    }
    catch (error) {
        console.error("Gemini Chat API call failed:", error);
        res.status(500).json({ error: "Our BV Life Guide is currently silent in deep meditation. Please check back shortly." });
    }
};
